import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Link } from '@react-pdf/renderer';
import type { AuditReport, CompanySettings } from '../../lib/types';

// Register a standard font (optional, using Helvetica by default which is built-in)
// Font.register({ family: 'Roboto', src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf' });

const styles = StyleSheet.create({
    page: {
        paddingTop: 30,
        paddingBottom: 40,
        paddingHorizontal: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#333',
        lineHeight: 1.4,
    },
    brandStrip: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 6,
        backgroundColor: '#0F766E', // Teal-700
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingBottom: 20,
    },
    logo: {
        width: 120,
        height: 80,
        objectFit: 'contain',
    },
    companyDetails: {
        alignItems: 'flex-end',
    },
    companyName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    companySubtitle: {
        fontSize: 9,
        color: '#6B7280',
    },
    titleContainer: {
        marginBottom: 25,
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingVertical: 8,
        borderRadius: 4,
    },
    reportTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    metaGrid: {
        flexDirection: 'row',
        marginBottom: 25,
        gap: 20,
    },
    metaItem: {
        flex: 1,
    },
    metaLabel: {
        fontSize: 8,
        color: '#6B7280',
        textTransform: 'uppercase',
        marginBottom: 4,
        fontWeight: 'bold',
    },
    metaValue: {
        fontSize: 11,
        color: '#111827',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingBottom: 4,
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: '#0F766E', // Teal Accent
        paddingBottom: 4,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#0F766E',
        textTransform: 'uppercase',
    },
    contentBox: {
        backgroundColor: '#F9FAFB',
        padding: 10,
        borderRadius: 4,
        minHeight: 40,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    textContent: {
        fontSize: 10,
        color: '#374151',
    },
    tableContainer: {
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#fff',
        minHeight: 24,
        alignItems: 'center',
    },
    tableRowHeader: {
        backgroundColor: '#F3F4F6',
    },
    colIndex: {
        width: 40,
        padding: 6,
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
        textAlign: 'center',
        color: '#6B7280',
        fontSize: 9,
    },
    colContent: {
        flex: 1,
        padding: 6,
        fontSize: 10,
        color: '#374151',
    },
    attachmentLink: {
        color: '#0F766E',
        textDecoration: 'none',
        fontSize: 10,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
    },
    signatureGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 40,
    },
    signatureBox: {
        flex: 1,
    },
    signatureLabel: {
        fontSize: 8,
        color: '#6B7280',
        textTransform: 'uppercase',
        marginBottom: 20,
    },
    signatureLine: {
        borderTopWidth: 1,
        borderTopColor: '#9CA3AF',
        paddingTop: 8,
        alignItems: 'center',
    },
    signerName: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#111827',
    },
    signerDate: {
        fontSize: 8,
        color: '#6B7280',
        marginTop: 2,
    }
});

interface AuditPDFProps {
    report: AuditReport;
    companySettings: CompanySettings | null;
}

const formatDate = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const AuditPDF: React.FC<AuditPDFProps> = ({ report, companySettings }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            {/* Brand Colors Strip */}
            <View style={styles.brandStrip} />

            {/* Header */}
            <View style={styles.headerContainer}>
                {companySettings?.logoUrl && (
                    <Image style={styles.logo} src={companySettings.logoUrl} />
                )}
                <View style={styles.companyDetails}>
                    <Text style={styles.companyName}>{companySettings?.companyName || 'ISO Management System'}</Text>
                    <Text style={styles.companySubtitle}>Internal Audit Report</Text>
                </View>
            </View>

            {/* Title */}
            <View style={styles.titleContainer}>
                <Text style={styles.reportTitle}>Audit Report for {report.area_process}</Text>
            </View>

            {/* Meta Data Grid */}
            <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Area / Process</Text>
                    <Text style={styles.metaValue}>{report.area_process}</Text>
                </View>
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Department</Text>
                    <Text style={styles.metaValue}>{report.department || 'N/A'}</Text>
                </View>
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Audit Date</Text>
                    <Text style={styles.metaValue}>{formatDate(report.audit_date)}</Text>
                </View>
            </View>

            {/* Conclusion */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Executive Conclusion</Text>
                </View>
                <View style={styles.contentBox}>
                    <Text style={styles.textContent}>{report.conclusion_text || 'No conclusion recorded.'}</Text>
                </View>
            </View>

            {/* Good Points */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Good Points</Text>
                </View>
                <View style={styles.tableContainer}>
                    {report.good_points.length > 0 ? (
                        report.good_points.map((pt, i) => (
                            <View key={i} style={styles.tableRow}>
                                <Text style={styles.colIndex}>{i + 1}</Text>
                                <Text style={styles.colContent}>{pt.text}</Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.tableRow}>
                            <Text style={{ ...styles.colContent, textAlign: 'center', color: '#9CA3AF', padding: 15 }}>
                                No good points recorded.
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Observations */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Observations (OFI)</Text>
                </View>
                <View style={styles.tableContainer}>
                    {report.observations_ofi.length > 0 ? (
                        report.observations_ofi.map((obs, i) => (
                            <View key={i} style={styles.tableRow}>
                                <Text style={styles.colIndex}>{i + 1}</Text>
                                <View style={styles.colContent}>
                                    <Text style={{ marginBottom: 2 }}>{obs.description}</Text>
                                    <Text style={{ fontSize: 8, color: '#6B7280' }}>Ref: {obs.clause_ref}</Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.tableRow}>
                            <Text style={{ ...styles.colContent, textAlign: 'center', color: '#9CA3AF', padding: 15 }}>
                                No observations recorded.
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Findings */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Non-Conformities (NC)</Text>
                </View>
                <View style={styles.tableContainer}>
                    {report.findings_nc.length > 0 ? (
                        report.findings_nc.map((find, i) => (
                            <View key={i} style={styles.tableRow}>
                                <Text style={styles.colIndex}>{i + 1}</Text>
                                <View style={styles.colContent}>
                                    <Text style={{ marginBottom: 2 }}>{find.description}</Text>
                                    {find.objective_evidence && find.objective_evidence.length > 0 && (
                                        <View style={{ marginBottom: 4, marginTop: 2 }}>
                                            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#374151', marginBottom: 1 }}>Objective Evidence:</Text>
                                            {find.objective_evidence.map((ev, idx) => (
                                                <Text key={idx} style={{ fontSize: 8, color: '#4B5563', marginLeft: 4 }}>
                                                    • {ev.text}
                                                </Text>
                                            ))}
                                        </View>
                                    )}
                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <Text style={{ fontSize: 8, color: '#EF4444', fontWeight: 'bold' }}>Type: {find.type}</Text>
                                        <Text style={{ fontSize: 8, color: '#6B7280' }}>Ref: {find.clause_ref}</Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.tableRow}>
                            <Text style={{ ...styles.colContent, textAlign: 'center', color: '#9CA3AF', padding: 15 }}>
                                No non-conformities recorded.
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Attachments */}
            {report.attachments_list.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Attachments</Text>
                    </View>
                    <View style={styles.tableContainer}>
                        {report.attachments_list.map((url, i) => (
                            <View key={i} style={styles.tableRow}>
                                <Text style={styles.colIndex}>{i + 1}</Text>
                                <View style={styles.colContent}>
                                    <Link src={url} style={styles.attachmentLink}>
                                        View Attachment {i + 1}
                                    </Link>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Footer Signatures */}
            <View style={styles.footer}>
                <View style={styles.signatureGrid}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Prepared By</Text>
                        <View style={styles.signatureLine}>
                            <Text style={styles.signerName}>{report.auditor_name || 'Auditor'}</Text>
                            <Text style={styles.signerDate}>Internal Auditor</Text>
                        </View>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Acknowledged By</Text>
                        <View style={styles.signatureLine}>
                            <Text style={styles.signerName}>{report.auditee_name || 'Auditee'}</Text>
                            <Text style={styles.signerDate}>Auditee Representative</Text>
                        </View>
                    </View>
                </View>
            </View>
        </Page>
    </Document>
);
