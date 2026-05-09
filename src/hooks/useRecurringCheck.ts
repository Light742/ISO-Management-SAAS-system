import { useState, useCallback } from 'react';
import { checkRecurringIssues } from '../lib/auditService';

interface RecurringAlert {
    clause: string;
    count: number;
    rowIndex: number;
}

export function useRecurringCheck(department: string) {
    const [alerts, setAlerts] = useState<RecurringAlert[]>([]);
    const [checking, setChecking] = useState(false);

    const checkClause = useCallback(async (clause: string, rowIndex: number) => {
        if (!clause || clause.length < 2 || !department) return;

        setChecking(true);
        try {
            const result = await checkRecurringIssues(clause, department);

            if (result.count > 0) {
                setAlerts(prev => {
                    // Remove existing alert for this row
                    const filtered = prev.filter(a => a.rowIndex !== rowIndex);
                    return [...filtered, { clause, count: result.count, rowIndex }];
                });
            } else {
                // Remove alert if clause no longer matches
                setAlerts(prev => prev.filter(a => a.rowIndex !== rowIndex));
            }
        } catch (error) {
            // Fail silently as per requirements
            console.error('Recurring check failed:', error);
        } finally {
            setChecking(false);
        }
    }, [department]);

    const clearAlerts = useCallback(() => {
        setAlerts([]);
    }, []);

    return { alerts, checking, checkClause, clearAlerts };
}
