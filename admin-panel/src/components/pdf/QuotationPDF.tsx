import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, borderBottom: 2, borderBottomColor: '#2563eb', paddingBottom: 20 },
  logoSection: { flexDirection: 'column' },
  companyName: { fontSize: 24, fontWeight: 'bold', color: '#2563eb' },
  companySub: { fontSize: 10, color: '#666', marginTop: 4 },
  titleSection: { textAlign: 'right' },
  title: { fontSize: 20, fontWeight: 'bold', textTransform: 'uppercase' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  infoBlock: { width: '45%' },
  label: { fontSize: 8, color: '#999', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 10, fontWeight: 'bold' },
  table: { marginTop: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderBottom: 1, borderBottomColor: '#e5e7eb', padding: 8 },
  tableRow: { flexDirection: 'row', borderBottom: 1, borderBottomColor: '#f3f4f6', padding: 8 },
  col1: { width: '60%' },
  col2: { width: '20%', textAlign: 'right' },
  col3: { width: '20%', textAlign: 'right' },
  headerText: { fontWeight: 'bold', fontSize: 8, color: '#666' },
  totalSection: { marginTop: 30, flexDirection: 'row', justifyContent: 'flex-end' },
  totalBlock: { width: '30%', borderTop: 1, borderTopColor: '#e5e7eb', paddingTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  grandTotal: { fontSize: 14, fontWeight: 'bold', color: '#2563eb' },
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40, borderTop: 1, borderTopColor: '#e5e7eb', paddingTop: 10, textAlign: 'center', color: '#999', fontSize: 8 },
});

export const QuotationPDF = ({ data }: { data: any }) => {
  const quoteId = String(data?.id || '').slice(0, 8).toUpperCase();
  const clientName = String(data?.lead?.clientName || 'N/A');
  const clientPhone = String(data?.lead?.clientPhone || '');
  const clientEmail = String(data?.lead?.clientEmail || '');
  const amountStr = String(data?.amount || '0');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Text style={styles.companyName}>TOQUE INSURANCE</Text>
            <Text style={styles.companySub}>Modern Insurance Solutions</Text>
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.title}>Quotation</Text>
            <Text style={{ marginTop: 4 }}>#{quoteId}</Text>
            <Text style={{ color: '#666' }}>Date: {new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.label}>Quotation For</Text>
            <Text style={styles.value}>{clientName}</Text>
            {clientPhone ? <Text style={{ marginTop: 2 }}>{clientPhone}</Text> : null}
            {clientEmail ? <Text>{clientEmail}</Text> : null}
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.label}>Prepared By</Text>
            <Text style={styles.value}>Toque Admin Team</Text>
            <Text style={{ marginTop: 2 }}>Valid Until: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, styles.headerText]}>Description</Text>
            <Text style={[styles.col2, styles.headerText]}>Tax</Text>
            <Text style={[styles.col3, styles.headerText]}>Amount</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={styles.col1}>Premium for Car Insurance (Comprehensive)</Text>
            <Text style={styles.col2}>18% GST</Text>
            <Text style={styles.col3}>₹{amountStr}</Text>
          </View>
        </View>

        <View style={styles.totalSection}>
          <View style={styles.totalBlock}>
            <View style={styles.totalRow}>
              <Text>Subtotal</Text>
              <Text>₹{amountStr}</Text>
            </View>
            <View style={[styles.totalRow, { marginTop: 10 }]}>
              <Text style={{ fontWeight: 'bold' }}>Grand Total</Text>
              <Text style={styles.grandTotal}>₹{amountStr}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Thank you for choosing Toque Insurance. This is a computer-generated document and does not require a signature.</Text>
          <Text style={{ marginTop: 4 }}>www.toqueinsurance.com | +91 98765 43210</Text>
        </View>
      </Page>
    </Document>
  );
};
