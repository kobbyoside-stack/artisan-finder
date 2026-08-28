import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../supabase';

interface Review {
  id: number;
  user_email: string;
  rating: number;
  comment: string;
}

interface Artisan {
  id: number;
  name: string;
  trade: string;
  rating: string;
  location: string;
  phone: string;
  bio: string;
  image_url?: string;
  user_id?: string;
}

export default function HomeScreen() {
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // New Artisan Form state
  const [name, setName] = useState('');
  const [trade, setTrade] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reviews State
  const [reviewsMap, setReviewsMap] = useState<{ [artisanId: number]: Review[] }>({});
  const [newReviewRating, setNewReviewRating] = useState<{ [artisanId: number]: string }>({});
  const [newReviewComment, setNewReviewComment] = useState<{ [artisanId: number]: string }>({});

  useEffect(() => {
    fetchArtisans();
  }, []);

  const fetchArtisans = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('artisans').select('*');
    if (error) {
      Alert.alert('Error fetching artisans', error.message);
    } else if (data) {
      setArtisans(data);
      data.forEach((artisan) => fetchReviews(artisan.id));
    }
    setLoading(false);
  };

  const fetchReviews = async (artisanId: number) => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('artisan_id', artisanId);
    if (!error && data) {
      setReviewsMap((prev) => ({ ...prev, [artisanId]: data }));
    }
  };

  const openMap = (loc: string) => {
    const encoded = encodeURIComponent(loc);
    const url = Platform.select({
      ios: `maps:0,0?q=${encoded}`,
      android: `geo:0,0?q=${encoded}`,
      web: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    });
    if (url) {
      Linking.openURL(url);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleAddArtisan = async () => {
    if (!name || !trade || !location || !phone) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = '';
      if (image) {
        const response = await fetch(image);
        const blob = await response.blob();
        const fileName = `${Date.now()}_artisan.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('artisan-images')
          .upload(fileName, blob);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('artisan-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from('artisans').insert([
        {
          name,
          trade,
          location,
          phone,
          bio: bio || 'No biography provided.',
          rating: '5.0',
          image_url: imageUrl,
        },
      ]);

      if (error) throw error;

      Alert.alert('Success', 'Artisan added successfully!');
      setName('');
      setTrade('');
      setLocation('');
      setPhone('');
      setBio('');
      setImage(null);
      fetchArtisans();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add artisan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReview = async (artisanId: number) => {
    const ratingStr = newReviewRating[artisanId];
    const comment = newReviewComment[artisanId];

    if (!ratingStr || !comment) {
      Alert.alert('Error', 'Please provide both rating and comment.');
      return;
    }

    const { error } = await supabase.from('reviews').insert([
      {
        artisan_id: artisanId,
        rating: parseFloat(ratingStr),
        comment,
      },
    ]);

    if (error) {
      Alert.alert('Error adding review', error.message);
    } else {
      Alert.alert('Success', 'Review submitted!');
      setNewReviewRating((prev) => ({ ...prev, [artisanId]: '' }));
      setNewReviewComment((prev) => ({ ...prev, [artisanId]: '' }));
      fetchReviews(artisanId);
    }
  };

  const filteredArtisans = artisans.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.trade.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCity =
      selectedCity === 'All' || selectedCity === 'All Cities'
        ? true
        : item.location.toLowerCase().includes(selectedCity.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All'
        ? true
        : item.trade.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCity && matchesCategory;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.pageTitle}>Find Artisans</Text>

      {/* Search Input */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by name, trade, or city..."
        placeholderTextColor="#71717a"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* City Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {['All Cities', 'Kumasi', 'Accra', 'Takoradi'].map((city) => (
          <TouchableOpacity
            key={city}
            style={[styles.cityChip, selectedCity === city && styles.activeChip]}
            onPress={() => setSelectedCity(city)}
          >
            <Text style={styles.chipText}>📍 {city}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {['All', 'Auto Mechanic', 'Electrician', 'Plumber', 'Carpenter'].map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, selectedCategory === cat && styles.activeChip]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={styles.chipText}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Artisan Cards List */}
      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.listContainer}>
          {filteredArtisans.map((artisan) => (
            <View key={artisan.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.artisanName}>{artisan.name}</Text>
                <Text style={styles.ratingText}>{artisan.rating} ★</Text>
              </View>

              <Text style={styles.categoryText}>{artisan.trade}</Text>

              {/* LOCATION ROW WITH INLINE MAP LINK */}
              <View style={styles.locationRow}>
                <Text style={styles.locationText}>📍 {artisan.location} </Text>
                <TouchableOpacity onPress={() => openMap(artisan.location)}>
                  <Text style={styles.mapLink}>(Map)</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.bioText}>{artisan.bio}</Text>

              {/* Reviews Section */}
              {reviewsMap[artisan.id] && reviewsMap[artisan.id].length > 0 && (
                <View style={styles.reviewsList}>
                  {reviewsMap[artisan.id].map((rev) => (
                    <View key={rev.id} style={styles.reviewItem}>
                      <Text style={styles.reviewUser}>Rating: {rev.rating} ★</Text>
                      <Text style={styles.reviewComment}>{rev.comment}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Add Review Form */}
              <View style={styles.addReviewForm}>
                <TextInput
                  style={styles.inputSmall}
                  placeholder="Rating (1-5)"
                  placeholderTextColor="#71717a"
                  keyboardType="numeric"
                  value={newReviewRating[artisan.id] || ''}
                  onChangeText={(val) =>
                    setNewReviewRating((prev) => ({ ...prev, [artisan.id]: val }))
                  }
                />
                <TextInput
                  style={styles.inputSmall}
                  placeholder="Write a comment..."
                  placeholderTextColor="#71717a"
                  value={newReviewComment[artisan.id] || ''}
                  onChangeText={(val) =>
                    setNewReviewComment((prev) => ({ ...prev, [artisan.id]: val }))
                  }
                />
                <TouchableOpacity
                  style={styles.smallSubmitBtn}
                  onPress={() => handleAddReview(artisan.id)}
                >
                  <Text style={styles.smallSubmitText}>Post Review</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Registration Form Card */}
      <View style={styles.cardForm}>
        <Text style={styles.formHeaderTitle}>Register New Artisan</Text>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#71717a"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Trade (e.g. Auto Mechanic)"
          placeholderTextColor="#71717a"
          value={trade}
          onChangeText={setTrade}
        />
        <TextInput
          style={styles.input}
          placeholder="Location (e.g. Kumasi)"
          placeholderTextColor="#71717a"
          value={location}
          onChangeText={setLocation}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor="#71717a"
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput
          style={[styles.input, { height: 70 }]}
          placeholder="Bio / Short Description"
          placeholderTextColor="#71717a"
          multiline
          value={bio}
          onChangeText={setBio}
        />

        <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
          <Text style={styles.imagePickerText}>
            {image ? 'Image Selected ✔' : 'Pick Profile Image'}
          </Text>
        </TouchableOpacity>

        {image && <Image source={{ uri: image }} style={styles.previewImage} />}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleAddArtisan}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Registering...' : 'Register Artisan'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cityChip: {
    backgroundColor: '#18181b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  categoryChip: {
    backgroundColor: '#18181b',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  activeChip: {
    backgroundColor: '#1e3a8a',
    borderColor: '#3b82f6',
  },
  chipText: {
    color: '#e4e4e7',
    fontSize: 13,
    fontWeight: '500',
  },
  listContainer: {
    marginTop: 8,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  artisanName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f59e0b',
  },
  categoryText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#a1a1aa',
  },
  mapLink: {
    fontSize: 13,
    color: '#60a5fa',
    fontWeight: '600',
  },
  bioText: {
    fontSize: 13,
    color: '#d4d4d8',
    lineHeight: 18,
  },
  reviewsList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  reviewItem: {
    marginBottom: 6,
  },
  reviewUser: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f59e0b',
  },
  reviewComment: {
    fontSize: 12,
    color: '#9ca3af',
  },
  addReviewForm: {
    marginTop: 10,
  },
  inputSmall: {
    backgroundColor: '#27272a',
    borderRadius: 6,
    padding: 8,
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 6,
  },
  smallSubmitBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  smallSubmitText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardForm: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  formHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#27272a',
    borderRadius: 8,
    padding: 10,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 10,
  },
  imagePickerBtn: {
    backgroundColor: '#27272a',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePickerText: {
    color: '#9ca3af',
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: '#10b981',
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