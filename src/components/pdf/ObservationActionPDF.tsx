import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import type { CompanySettings } from '../../lib/types';

const styles = StyleSheet.create({
    page: {
        paddingTop: 30,
        paddingBottom: 40,
        paddingHorizontal: 30,
        fontFamily: 'Helvetica',
        fontSize: 9,
        color: '#333',
        lineHeight: 1.4,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 10,
    },
    logoSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logo: {
        width: 80,
        height: 40,
        objectFit: 'contain',
    },
    topRightText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    metaTable: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#000',
        marginBottom: 20,
    },
    titleRow: {
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        padding: 5,
        backgroundColor: '#fff',
    },
    titleText: {
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    metaRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
    },
    metaCellLabel: {
        width: '18%',
        padding: 4,
        borderRightWidth: 1,
        borderRightColor: '#000',
        fontWeight: 'bold',
        fontSize: 8,
    },
    metaCellValue: {
        width: '32%',
        padding: 4,
        fontSize: 9,
    },
    metaCellValueWithBorder: {
        width: '32%',
        padding: 4,
        borderRightWidth: 1,
        borderRightColor: '#000',
        fontSize: 9,
    },
    label: {
        fontWeight: 'bold',
    },
    value: {
        flex: 1,
    },
    mainTable: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#000',
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
    },
    tableHeaderCell: {
        padding: 4,
        borderRightWidth: 1,
        borderRightColor: '#000',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 8,
        justifyContent: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        minHeight: 60,
    },
    tableCell: {
        padding: 4,
        borderRightWidth: 1,
        borderRightColor: '#000',
        fontSize: 8,
    },
    lastCell: {
        borderRightWidth: 0,
    },
    signatureGrid: {
        flexDirection: 'row',
        marginTop: 30,
        gap: 30,
    },
    signatureBox: {
        flex: 1,
    },
    signatureLine: {
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        marginTop: 20,
        marginBottom: 5,
        minHeight: 15,
    },
    signatureText: {
        fontSize: 10,
        color: '#1e3a8a',
        textAlign: 'center',
    },
    signatureLabel: {
        textAlign: 'center',
        fontSize: 7,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    }
});

interface ObservationRow {
    id: string;
    observation: string;
    action: string;
    responsiblePerson: string;
    dueDate: string;
    evalDate: string;
    status: string;
    evidence: string[];
}

interface ObservationActionPDFProps {
    data: {
        department: string;
        auditDate: string;
        auditeeName: string;
        auditorName: string;
        evaluatedByName: string;
        rows: ObservationRow[];
    };
    companySettings: CompanySettings | null;
}

export const ObservationActionPDF: React.FC<ObservationActionPDFProps> = ({ data, companySettings }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <View style={styles.logoSection}>
                    {companySettings?.logoUrl && (
                        <Image style={styles.logo} src={companySettings.logoUrl} />
                    )}
                </View>
                <Text style={styles.topRightText}>{companySettings?.companyName || 'Malita Power Inc.'}</Text>
            </View>

            {/* Meta Data */}
            <View style={styles.metaTable}>
                <View style={styles.titleRow}>
                    <Text style={styles.titleText}>IMS Observation Action Form</Text>
                </View>
                <View style={styles.metaRow}>
                    <Text style={styles.metaCellLabel}>Department :</Text>
                    <Text style={styles.metaCellValueWithBorder}>{data.department}</Text>
                    <Text style={styles.metaCellLabel}>Date :</Text>
                    <Text style={styles.metaCellValue}>{data.auditDate}</Text>
                </View>
                <View style={{ ...styles.metaRow, borderBottomWidth: 0 }}>
                    <Text style={styles.metaCellLabel}>Auditee :</Text>
                    <Text style={styles.metaCellValueWithBorder}>{data.auditeeName}</Text>
                    <Text style={styles.metaCellLabel}>Auditors :</Text>
                    <Text style={styles.metaCellValue}>{data.auditorName}</Text>
                </View>
            </View>

            {/* Table */}
            <View style={styles.mainTable}>
                {/* Complex Header */}
                <View style={styles.tableHeaderRow}>
                    <View style={{ ...styles.tableHeaderCell, width: '5%' }}><Text>No.</Text></View>
                    <View style={{ ...styles.tableHeaderCell, width: '25%' }}><Text>Observations Statement</Text></View>
                    <View style={{ width: '40%', borderRightWidth: 1, borderRightColor: '#000' }}>
                        <View style={{ padding: 4, borderBottomWidth: 1, borderBottomColor: '#000', alignItems: 'center' }}>
                            <Text>Intended Correction and Corrective Action</Text>
                            <Text style={{ fontSize: 6, fontWeight: 'normal' }}>(Completed by Auditee)</Text>
                        </View>
                        <View style={{ flexDirection: 'row' }}>
                            <View style={{ ...styles.tableHeaderCell, width: '45%', borderBottomWidth: 0 }}><Text>Action</Text></View>
                            <View style={{ ...styles.tableHeaderCell, width: '25%', borderBottomWidth: 0 }}><Text>Responsible Person</Text></View>
                            <View style={{ ...styles.tableHeaderCell, width: '30%', borderRightWidth: 0, borderBottomWidth: 0 }}><Text>Due Date</Text></View>
                        </View>
                    </View>
                    <View style={{ width: '30%' }}>
                        <View style={{ padding: 4, borderBottomWidth: 1, borderBottomColor: '#000', alignItems: 'center' }}>
                            <Text>Evaluation of CA</Text>
                            <Text style={{ fontSize: 6, fontWeight: 'normal' }}>(to be completed by auditor)</Text>
                        </View>
                        <View style={{ flexDirection: 'row' }}>
                            <View style={{ ...styles.tableHeaderCell, width: '30%', borderBottomWidth: 0 }}><Text>Date</Text></View>
                            <View style={{ ...styles.tableHeaderCell, width: '25%', borderBottomWidth: 0 }}><Text>Status</Text></View>
                            <View style={{ ...styles.tableHeaderCell, width: '45%', borderRightWidth: 0, borderBottomWidth: 0 }}><Text>Evidence provided</Text></View>
                        </View>
                    </View>
                </View>

                {/* Rows */}
                {data.rows.map((row, index) => (
                    <View key={row.id} style={styles.tableRow}>
                        <View style={{ ...styles.tableCell, width: '5%', textAlign: 'center' }}><Text>{index + 1}</Text></View>
                        <View style={{ ...styles.tableCell, width: '25%' }}><Text>{row.observation}</Text></View>
                        <View style={{ ...styles.tableCell, width: '18%' }}><Text>{row.action}</Text></View>
                        <View style={{ ...styles.tableCell, width: '10%' }}><Text>{row.responsiblePerson}</Text></View>
                        <View style={{ ...styles.tableCell, width: '12%' }}><Text>{row.dueDate}</Text></View>
                        <View style={{ ...styles.tableCell, width: '9%' }}><Text>{row.evalDate}</Text></View>
                        <View style={{ ...styles.tableCell, width: '7.5%', textAlign: 'center' }}>
                            <Text style={{ color: row.status === 'E' ? '#16a34a' : row.status === 'A' ? '#2563eb' : '#000', fontWeight: 'bold' }}>
                                {row.status}
                            </Text>
                        </View>
                        <View style={{ ...styles.tableCell, width: '13.5%', borderRightWidth: 0 }}>
                            {row.evidence.map((_url, i) => (
                                <Text key={i} style={{ fontSize: 6, color: '#1d4ed8' }}>
                                    Att. {i + 1}
                                </Text>
                            ))}
                        </View>
                    </View>
                ))}
            </View>

            {/* Signatures */}
            <View style={styles.signatureGrid}>
                <View style={styles.signatureBox}>
                    <Text style={{ fontWeight: 'bold' }}>Prepared by:</Text>
                    <View style={styles.signatureLine}>
                        <Text style={styles.signatureText}>{data.auditeeName}</Text>
                    </View>
                    <Text style={styles.signatureLabel}>Auditee (Sign & Date)</Text>
                </View>
                <View style={styles.signatureBox}>
                    <Text style={{ fontWeight: 'bold' }}>Accepted by:</Text>
                    <View style={styles.signatureLine}>
                        <Text style={styles.signatureText}>{data.auditorName}</Text>
                    </View>
                    <Text style={styles.signatureLabel}>Auditor/s (Sign & Date)</Text>
                </View>
                <View style={styles.signatureBox}>
                    <Text style={{ fontWeight: 'bold' }}>Evaluated by:</Text>
                    <View style={styles.signatureLine}>
                        <Text style={styles.signatureText}>{data.evaluatedByName}</Text>
                    </View>
                    <Text style={styles.signatureLabel}>Auditor/s (Sign & Date)</Text>
                </View>
            </View>
        </Page>
    </Document>
);
