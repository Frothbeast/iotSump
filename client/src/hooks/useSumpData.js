import { useState, useEffect } from 'react';

export function useSumpData(hours) {
    const [sumpRecords, setSumpRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let interval;

        const fetchData = () => {
            fetch(`/api/sumpData?hours=${hours}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setSumpRecords(data);
                    }
                    setIsLoading(false);
                })
                .catch(err => {
                    console.error("Fetch error:", err);
                    setIsLoading(false);
                });
        };

        const setupInterval = () => {
            if (interval) clearInterval(interval);
            
            // If tab is visible, 1 second. If hidden, 60 seconds.
            const pollRate = document.visibilityState === 'visible' ? 1000 : 60000;
            
            interval = setInterval(fetchData, pollRate);
        };
        fetchData();
        setupInterval();
        const handleVisibility = () => {
            console.log(`Visibility changed to: ${document.visibilityState}. Adjusting poll rate.`);
            setupInterval();
        };

        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [hours]);

    return { sumpRecords, isLoading };
}