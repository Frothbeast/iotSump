import React from 'react';
import './sumpTable.css';

const SumpTable = ({ sumpRecords = [], columnStats }) => {
    if (!columnStats) return null;

    return (
	<div className="sumpTableContainer">
            <table className="sumpTable">
                <thead className="sumpTableHeader">
                    <tr className="sumpTableHeaderRow1">
                        <th className="sumpTableHeaderCell1Row1"></th>
                        <th className="sumpTableHeaderCell2Row1" >TIME</th>
                        <th className="sumpTableHeaderCellRow1" >High</th>
                        <th className="sumpTableHeaderCellRow1" >Low</th>
                        <th className="sumpTableHeaderCellRow1" >On</th>
                        <th className="sumpTableHeaderCellRow1" >Off</th>
                        <th className="sumpTableHeaderCellRow1" >Duty</th> 
                    </tr>
                    <tr className="sumpTableHeaderRow2">
                        <th className="sumpTableHeaderCell1Row2">MAX</th>
                        <th className="sumpTableHeaderCell2Row2">{columnStats.datetime.max}</th>
                        <th className="sumpTableHeaderCellRow2">{columnStats.Hadc.max}</th>
                        <th className="sumpTableHeaderCellRow2">{columnStats.Ladc.max}</th>
                        <th className="sumpTableHeaderCellRow2">{columnStats.timeOn.max}</th>
                        <th className="sumpTableHeaderCellRow2">{columnStats.timeOff.max}</th>
    		            <th className="sumpTableHeaderCellRow2">{columnStats.duty.max}</th> 
                    </tr>
                    <tr className="sumpTableHeaderRow3">
                        <th className="sumpTableHeaderCell1Row3">AVG</th>
                        <th className="sumpTableHeaderCell2Row3">{columnStats.datetime.avg}</th>
                        <th className="sumpTableHeaderCellRow3">{columnStats.Hadc.avg}</th>
                        <th className="sumpTableHeaderCellRow3">{columnStats.Ladc.avg}</th>
                        <th className="sumpTableHeaderCellRow3">{columnStats.timeOn.avg}</th>
                        <th className="sumpTableHeaderCellRow3">{columnStats.timeOff.avg}</th>
    		            <th className="sumpTableHeaderCellRow3">{columnStats.duty.avg}</th> 
                    </tr>
                    <tr className="sumpTableHeaderRow4">
                        <th className="sumpTableHeaderCell1Row4">MIN</th>
                        <th className="sumpTableHeaderCell2Row4">{columnStats.datetime.min}</th>
                        <th className="sumpTableHeaderCellRow4">{columnStats.Hadc.min}</th>
                        <th className="sumpTableHeaderCellRow4">{columnStats.Ladc.min}</th>
                        <th className="sumpTableHeaderCellRow4">{columnStats.timeOn.min}</th>
                        <th className="sumpTableHeaderCellRow4">{columnStats.timeOff.min}</th>
    		            <th className="sumpTableHeaderCellRow4">{columnStats.duty.min}</th>  
                    </tr>
                </thead>
                <tbody className="sumpTableBody">
                    <tr className="sumpTablePlaceholder"></tr>
                    {Array.isArray(sumpRecords) && sumpRecords.map((record) => (
                        <tr key={record.id} className="sumpTableRow">
                            <td className="sumpTableCell1"></td>
                            <td className="sumpTableCell2">{record.payload?.datetime ? record.payload.datetime.split(' ')[1] : "N/a"}</td>
                            <td className="sumpTableCell">{record.payload?.Hadc ?? "N/a"}</td>
			                      <td className="sumpTableCell">{record.payload?.Ladc ?? "N/a"}</td>
                            <td className="sumpTableCell">{record.payload?.timeOn ?? "N/a"}</td>
                            <td className="sumpTableCell">{record.payload?.timeOff ?? "N/a"}</td>
                            <td className="sumpTableCell">{record.payload?.duty ?? "N/a"}</td>
                        </tr>
                    ))}
                </tbody>
	    </table>
	</div>
    );
};

export default SumpTable;
