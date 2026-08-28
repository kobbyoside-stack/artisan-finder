import { useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

// Mock Artisan Data
const ARTISAN_DATA = {
  id: '1',
  name: 'Kwame Mensah',
  category: 'Auto Mechanic',
  rating: 4.8,
  reviewsCount: 24,
  location: 'Kumasi, Ghana',
  bio: 'Certified auto technician with over 8 years of experience in engine diagnostics, electronic repairs, and general vehicle maintenance. Dedicated to fast, reliable service.',
  phone: '+233 24 000 0000',
  mapCoordinates: {
    latitude: 6.6885,
    longitude: -1.6244,
  },
};

export default function ExploreScreen() {
  const [artisan] = useState(ARTISAN_DATA);
  const [reviewText, setReviewText] = useState('');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header Profile Section */}
      <View style={styles.headerCard}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{artisan.name.charAt(0)}</Text>
        </View>
        <Text style={styles.nameText}>{artisan.name}</Text>
        <Text style={styles.categoryText}>{artisan.category}</Text>
        <Text style={styles.locationText}>📍 {artisan.location}</Text>
      </View>

      {/* 1. SEPARATE BIO CARD */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>About / Bio</Text>
        <Text style={styles.bioText}>{artisan.bio}</Text>
      </View>

      {/* 2. SEPARATE MAP CARD */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Location & Map</Text>
        <View style={styles.mapContainer}>
          <View style={styles.mapMock}>
            <Text style={styles.mapPinIcon}>📍</Text>
            <Text style={styles.mapText}>Map Preview Area</Text>
            <Text style={styles.coordinatesText}>
              Lat: {artisan.mapCoordinates.latitude}, Lon: {artisan.mapCoordinates.longitude}
            </Text>
          </View>
        </View>
      </View>

      {/* Review Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Reviews & Rating</Text>
        <Text style={styles.ratingText}>⭐ {artisan.rating} ({artisan.reviewsCount} reviews)</Text>

        <Text style={styles.formHeaderTitle}>Add a Review</Text>
        <TextInput
          style={styles.input}
          placeholder="Write your feedback here..."
          value={reviewText}
          onChangeText={setReviewText}
          multiline
        />
        <TouchableOpacity style={styles.submitButton} onPress={() => setReviewText('')}>
          <Text style={styles.submitButtonText}>Submit Review</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  nameText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  categoryText: {
    fontSize: 16,
    color: '#0284c7',
    fontWeight: '600',
    marginTop: 2,
  },
  locationText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  bioText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  mapMock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#cbd5e1',
  },
  mapPinIcon: {
    fontSize: 28,
  },
  mapText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 4,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  formHeaderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginTop: 8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});