// 3.3V circuit - Sump Pump Controller February 2026 Dan Jubenville
#include <xc.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include "config.h"

// Direct register mapping for XC8 v3.10 compatibility
#ifndef CMCON
#define CMCON  (*(volatile __near unsigned char*)0xFB4)
#endif
#define CVRCON (*(volatile __near unsigned char*)0xFB5)
#define PIR2_REG (*(volatile __near unsigned char*)0xFA1)

// Configuration for 18LF2580
#pragma config OSC = HS         
#pragma config WDT = OFF        
#pragma config WDTPS = 4096     
#pragma config BOREN = OFF      
#pragma config LVP = OFF       
#define _XTAL_FREQ 20000000

// Hardware Mapping
#define SSR_out            LATC0           
#define TRIS_SSR           TRISC0          
#define Display_Pin        LATBbits.LATB4  
#define TRIS_Display       TRISB4          
#define SENSOR_PWR         LATA3

// Circular Buffer for Display
#define DISP_BUF_SIZE 255
volatile char disp_buffer[DISP_BUF_SIZE];
volatile uint8_t disp_head = 0;
volatile uint8_t disp_tail = 0;

// Timing variables for Seetron serial backpack
uint16_t displayDelayCounter = 0; 

// Application Variables
volatile char error_msg[5] = " OK";
uint8_t wasOn = 0, wasOff = 0, triggerSecondCount = 0;
uint8_t highLevelStatus, lowLevelStatus, timeToDisplay = 0;
uint32_t secondsSincePowerup = 0;
uint16_t hoursSincePowerup = 0, currentOnTime = 0, currentOffTime = 0, secondsCounter = 0, duty = 50;
uint16_t lastOnTime = 0, lastOffTime = 0, espFails;
uint8_t pumpState = 0; 
uint8_t initialSendDone = 0;
uint16_t lowSampleCount = 0, highSampleCount = 0;

// Raw and Filtered ADC values
uint16_t low_val = 0, high_val = 0;
uint16_t low_filtered = 1000, high_filtered = 1000;

// Data capture
uint32_t lowSum = 0, highSum = 0;
uint16_t lastLatod = 0, lastHatod = 0;

// --- NEW DATA BUFFERING LOGIC ---
#define MAX_RECORDS 10
typedef struct {
    uint16_t h_adc;
    uint16_t l_adc;
    uint16_t hrs;
    uint16_t on_t;
    uint16_t off_t;
} pump_record_t;

pump_record_t record_buffer[MAX_RECORDS];
uint8_t buf_head = 0; 
uint8_t buf_tail = 0; 
uint8_t records_pending = 0;

void save_to_buffer(uint16_t h, uint16_t l, uint16_t hrs, uint16_t ont, uint16_t offt) {
    if (records_pending < MAX_RECORDS) {
        record_buffer[buf_head].h_adc = h;
        record_buffer[buf_head].l_adc = l;
        record_buffer[buf_head].hrs = hrs;
        record_buffer[buf_head].on_t = ont;
        record_buffer[buf_head].off_t = offt;
        buf_head = (buf_head + 1) % MAX_RECORDS;
        records_pending++;
    } else {
        strcpy((char*)error_msg, "FULL");
    }
}
// --------------------------------

// ESP State Machine
typedef enum { 
    ESP_IDLE, ESP_START_CONNECT, ESP_WAIT_AT, ESP_WAIT_CONNECT, 
    ESP_START_SEND_CMD, ESP_WAIT_PROMPT, ESP_SEND_DATA, 
    ESP_WAIT_SEND_OK, ESP_WAIT_HANDSHAKE 
} esp_state_t;
esp_state_t currentEspState = ESP_IDLE;
uint16_t espTimer = 0;
volatile char rx_buf[64];
volatile uint8_t rx_idx = 0;

// Function Prototypes
void put_to_disp_buf(const char* str);
void process_display_buffer(void);
int8_t updateDisplayCoord(uint8_t line, uint8_t column, const char* str);
void software_putch(char data); 
void uart_send_string(const char* s);
void process_esp_state_machine(void);
uint16_t read_adc(uint8_t channel);

void __interrupt() v_isr(void) {
    if (INTCONbits.TMR0IF) {
        secondsCounter++;
        if (secondsCounter >= 9223) { 
            secondsCounter = 0;
            triggerSecondCount = 1;
            if (espTimer > 0) espTimer--; 
        }
        INTCONbits.TMR0IF = 0; 
    }
    if (PIR1bits.RCIF) {
        char c = RCREG; 
        if (rx_idx < 63) {
            rx_buf[rx_idx++] = c;
            rx_buf[rx_idx] = '\0';
        }
        if (RCSTAbits.OERR) { RCSTAbits.CREN = 0; RCSTAbits.CREN = 1; }
    }
}

uint16_t read_adc(uint8_t channel) {
    ADCON0 = (uint8_t)((channel << 2) & 0x3C); 
    ADCON0bits.ADON = 1;
    __delay_us(20); 
    ADCON0bits.GO = 1;
    while(ADCON0bits.GO);
    return (uint16_t)((ADRESH << 8) | ADRESL);
}

void software_putch(char data) {
    uint8_t status = INTCONbits.GIE;
    INTCONbits.GIE = 0; 
    Display_Pin = 1; 
    __delay_us(104); 
    for(uint8_t b=0; b<8; b++) {
        if((data >> b) & 0x01) Display_Pin = 0;
        else Display_Pin = 1;
        __delay_us(104);
    }
    Display_Pin = 0; 
    __delay_us(104);
    INTCONbits.GIE = status; 
}

void put_to_disp_buf(const char* str) {
    while(*str) {
        uint8_t next = (disp_head + 1) % DISP_BUF_SIZE;
        if(next != disp_tail) {
            disp_buffer[disp_head] = *str++;
            disp_head = next;
        } else break;
    }
}

void process_display_buffer(void) {
    if (displayDelayCounter > 0) { displayDelayCounter--; return; }
    
    if(disp_head != disp_tail && currentEspState == ESP_IDLE) {
        char c = disp_buffer[disp_tail];
        software_putch(c);
        if (c < 32) displayDelayCounter = 100; 
        else displayDelayCounter = 2; 
        disp_tail = (disp_tail + 1) % DISP_BUF_SIZE;
    }
}

int8_t updateDisplayCoord(uint8_t line, uint8_t column, const char* str) {
    uint8_t addr;
    switch (line) {
        case 1: addr = 64 + (column - 1); break; 
        case 2: addr = 84 + (column - 1); break; 
        case 3: addr = 104 + (column - 1); break;
        case 4: addr = 124 + (column - 1); break;
        default: return 0;
    }
    char cmd_seq[3] = {16, addr, '\0'};
    put_to_disp_buf(cmd_seq);
    put_to_disp_buf(str);
    return 1;
}

void uart_send_string(const char* s) {
    while(*s) {
        while(!PIR1bits.TXIF); 
        TXREG = *s++;          
    }
}

void process_esp_state_machine(void) {
    char data_str[24], cmd_str[64];
    char error_display[21];
    
    if (pumpState == 1) { currentEspState = ESP_IDLE; return; }

    // Kick off connection if records are waiting
    if (currentEspState == ESP_IDLE && records_pending > 0) {
        currentEspState = ESP_START_CONNECT;
    }

    switch(currentEspState) {
        case ESP_IDLE: break;
        case ESP_START_CONNECT:
            RCSTAbits.CREN = 0; RCSTAbits.CREN = 1;
            rx_idx = 0; rx_buf[0] = '\0';
            uart_send_string("ATE0\r\n");
            espTimer = 3; currentEspState = ESP_WAIT_AT; strcpy((char*)error_msg, "er1");
            break;
        case ESP_WAIT_AT:
            if(strstr((const char*)rx_buf, "OK")) {
                rx_idx = 0; rx_buf[0] = '\0';
                sprintf(cmd_str, "AT+CIPSTART=\"TCP\",\"%s\",%s\r\n", SERVER_IP, SERVER_PORT);
                uart_send_string(cmd_str);
                espTimer = 10; currentEspState = ESP_WAIT_CONNECT; strcpy((char*)error_msg, "er2");
            } else if (espTimer == 0) {
                currentEspState = ESP_IDLE; strcpy((char*)error_msg, "er3");
                espFails++;
            }
            break;
        case ESP_WAIT_CONNECT:
            if(strstr((const char*)rx_buf, "OK") || strstr((const char*)rx_buf, "ALREADY CONNECTED")) {
                rx_idx = 0; rx_buf[0] = '\0';
                currentEspState = ESP_START_SEND_CMD; strcpy((char*)error_msg, "er4");
            } else if (espTimer == 0) { 
                currentEspState = ESP_IDLE; strcpy((char*)error_msg, "er5");
                espFails++;
            }
            break;
        case ESP_START_SEND_CMD:
            snprintf(data_str, sizeof(data_str), "%04X%04X%04X%04X%04X\r\n", 
                    record_buffer[buf_tail].h_adc, record_buffer[buf_tail].l_adc, 
                    record_buffer[buf_tail].hrs, record_buffer[buf_tail].on_t, 
                    record_buffer[buf_tail].off_t);
            sprintf(cmd_str, "AT+CIPSEND=%d\r\n", (int)strlen(data_str));
            rx_idx = 0; rx_buf[0] = '\0';
            uart_send_string(cmd_str);
            espTimer = 2; currentEspState = ESP_WAIT_PROMPT; strcpy((char*)error_msg, "er6");
            break;
        case ESP_WAIT_PROMPT:
            if(strstr((const char*)rx_buf, ">")) {
                rx_idx = 0; rx_buf[0] = '\0';
                currentEspState = ESP_SEND_DATA; strcpy((char*)error_msg, "er7");
            } else if (espTimer == 0) {
                currentEspState = ESP_IDLE; strcpy((char*)error_msg, "er8");
                espFails++;
            }
            break;
        case ESP_SEND_DATA:
            snprintf(data_str, sizeof(data_str), "%04X%04X%04X%04X%04X\r\n", 
                    record_buffer[buf_tail].h_adc, record_buffer[buf_tail].l_adc, 
                    record_buffer[buf_tail].hrs, record_buffer[buf_tail].on_t, 
                    record_buffer[buf_tail].off_t);
            rx_idx = 0; rx_buf[0] = '\0';
            uart_send_string(data_str);
            espTimer = 3; currentEspState = ESP_WAIT_SEND_OK; strcpy((char*)error_msg, "er9");
            break;
        case ESP_WAIT_SEND_OK:
            if(strstr((const char*)rx_buf, "SEND OK")) {
                rx_idx = 0; rx_buf[0] = '\0';
                espTimer = 5; 
                currentEspState = ESP_WAIT_HANDSHAKE;
                strcpy((char*)error_msg, "hnd");
            } else if (espTimer == 0) {
                currentEspState = ESP_IDLE; strcpy((char*)error_msg, "er0S");
                espFails++;
            }
            break;
        case ESP_WAIT_HANDSHAKE:
            if(strstr((const char*)rx_buf, "ACK")) {
                // Success: remove from buffer
                buf_tail = (buf_tail + 1) % MAX_RECORDS;
                records_pending--;
                
                updateDisplayCoord(4, 1, "Server: ACK         ");
                currentEspState = ESP_IDLE;
                strcpy((char*)error_msg, " OK");
            } else if(strstr((const char*)rx_buf, "ERR")) {
                updateDisplayCoord(4, 1, "Server: ERR         ");
                currentEspState = ESP_IDLE;
                strcpy((char*)error_msg, "eHD");
            } else if (espTimer == 0) {
                updateDisplayCoord(4, 1, "Server: H-OUT       ");
                currentEspState = ESP_IDLE;
                strcpy((char*)error_msg, "eTO");
                espFails++;
            }
            break;
    }
}

void main(void) {
    INTCON = 0x00; PIE1 = 0x00; RCSTA = 0x00;
    ADCON1 = 0x0D; ADCON2 = 0x92; TRISA = 0x07; TRISA3 = 0; TRIS_SSR = 0; 
    Display_Pin = 0; TRIS_Display = 0; CVRCON = 0x00; CMCON = 0x07;  
    TRISC6 = 0; TRISC7 = 1; 
    T0CON = 0xC0;       

    __delay_ms(100);
    software_putch(12); __delay_ms(100); software_putch(14);
    
    updateDisplayCoord(1, 1, "Sump Wifi Control");
    updateDisplayCoord(2, 2, "Dan Jubenville");
    updateDisplayCoord(3, 3, "January 2026");
    
    while(disp_head != disp_tail) { process_display_buffer(); }

    SPBRG = 10; TXSTA = 0x24; RCSTA = 0x90; 
    
    volatile char dummy;
    dummy = RCREG; dummy = RCREG;
    RCSTAbits.CREN = 0; RCSTAbits.CREN = 1;          

    PIE1bits.RCIE = 1; INTCONbits.TMR0IE = 1; INTCONbits.PEIE = 1; INTCONbits.GIE = 1;    
    SENSOR_PWR = 1;

    while (1) {
        process_display_buffer(); 

        low_val = read_adc(0);
        high_val = read_adc(1);
        low_filtered = (uint16_t)((low_val >> 3) + (low_filtered - (low_filtered >> 3)));
        high_filtered = (uint16_t)((high_val >> 3) + (high_filtered - (high_filtered >> 3)));

        lowLevelStatus = (low_filtered < 900) ? 1 : 0;
        highLevelStatus = (high_filtered < 900) ? 1 : 0;
        
        if (highLevelStatus) { 
            if (pumpState == 0) {
                uint32_t rapidSum = 0;
                for(uint8_t i = 0; i < 10; i++) {
                    rapidSum += read_adc(1); __delay_ms(1);           
                }
                lastHatod = (uint16_t)(rapidSum / 10);        
                SSR_out = 1; pumpState = 1; 
            }
        }
        else if (!lowLevelStatus && !highLevelStatus) { 
            SSR_out = 0; 
            if (pumpState == 1) { 
                if (lowSampleCount > 0) lastLatod = (uint16_t)(lowSum / lowSampleCount);
                lastOnTime = currentOnTime;
                currentOnTime = 0;
                wasOn = 0;
                                
                save_to_buffer(lastHatod, lastLatod, hoursSincePowerup, lastOnTime, lastOffTime);

                lowSum = 0; lowSampleCount = 0; 
                if ((lastOnTime + lastOffTime) > 0) {
                    duty = (uint16_t)((100UL * lastOnTime) / (lastOnTime + lastOffTime));
                }
            }
            pumpState = 0; 
        }

        if (triggerSecondCount) {
            triggerSecondCount = 0;
            timeToDisplay = 1;
            secondsSincePowerup++;
            if (secondsSincePowerup == 10 && !initialSendDone) {
                if (lowSampleCount > 0) lastLatod = (uint16_t)(lowSum / lowSampleCount);
                if (highSampleCount > 0) lastHatod = (uint16_t)(highSum / highSampleCount);
                
                save_to_buffer(lastHatod, lastLatod, hoursSincePowerup, 0, 0);
                
                initialSendDone = 1;
                espFails=0;
            }
            if (pumpState == 1) {
                highSum += high_val; highSampleCount++;
                currentOnTime++; wasOn = 1;
                if (wasOff) { lastOffTime = currentOffTime; currentOffTime = 0; wasOff = 0; }
            } else {
                lowSum += low_val; lowSampleCount++;
                currentOffTime++; wasOff = 1;
            }
            if (secondsSincePowerup % 3600 == 0) hoursSincePowerup++;
        }

        if (timeToDisplay) {
            char line1[21], line2[21], line3[21], line4[21];
            sprintf(line1, "L:%04u H:%04u %s %02d", low_val, high_val, (pumpState) ? "ON " : "OFF", duty);
            sprintf(line2, "On:%04u Off:%04u %s", (pumpState) ? currentOnTime : lastOnTime, (pumpState) ? lastOffTime : currentOffTime, error_msg);
            sprintf(line3, "Hrs: %05u espX:%04u", hoursSincePowerup, espFails);
            sprintf(line4, "Pending: %u/%u      ", records_pending, MAX_RECORDS);
            
            updateDisplayCoord(1, 1, line1);
            updateDisplayCoord(2, 1, line2);
            updateDisplayCoord(3, 1, line3);
            if (pumpState == 1) updateDisplayCoord(4, 1, "Pumping Cycle...    ");
            else updateDisplayCoord(4, 1, line4);
            timeToDisplay = 0;
        }
        process_esp_state_machine();
    }
}