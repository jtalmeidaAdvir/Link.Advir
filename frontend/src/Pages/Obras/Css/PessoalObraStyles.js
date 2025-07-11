import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: '100%',
    backgroundColor: '#f5f7fa',
    fontFamily: 'System',
  },
  headerContainer: {
    width: '100%',
    marginBottom: 20,
  },
  headerGradient: {
    backgroundColor: '#1792FE',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#1792FE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    textAlign: 'center',
    color: 'white',
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 18,
    fontWeight: '500',
    opacity: 0.9,
    color: '#fff',
  },
  headerCount: {
    fontSize: 14,
    opacity: 0.8,
    color: '#fff',
  },
  datePickerContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    borderColor: 'rgba(23, 146, 254, 0.1)',
    borderWidth: 1,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  dateIcon: {
    color: '#1792FE',
    fontSize: 20,
    marginRight: 10,
  },
  datePickerContent: {
    gap: 10,
  },
  dateInput: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderColor: '#e9ecef',
    borderWidth: 2,
    borderRadius: 8,
    fontSize: 16,
  },
  selectedDate: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: '#1792FE',
    color: 'white',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default styles;
