import { User } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';

interface Review {
  id: number;
  artisan_id: number;
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

const CATEGORIES = ['All', 'Auto Mechanic', 'Electrician', 'Plumber', 'Carpenter', 'Welder'];
const CITIES = ['All Cities', 'Kumasi', 'Accra', 'Takoradi', 'Tamale', 'Sunyani'];

export default function HomeScreen() {
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [filteredArtisans, setFilteredArtisans] = useState<Artisan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCity, setSelectedCity] = useState('All Cities');

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // My Profile View State
  const [showMyListingsOnly, setShowMyListingsOnly] = useState(false);

  // Detail Modal & Reviews
  const [selectedArtisan, setSelectedArtisan] = useState<Artisan | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Registration & Editing State
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingArtisanId, setEditingArtisanId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [newTrade, setNewTrade] = useState('Auto Mechanic');
  const [newLocation, setNewLocation] = useState('Kumasi');
  const [newPhone, setNewPhone] = useState('');
  const [newBio, setNewBio] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      fetchArtisans();
    });

    fetchArtisans();

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artisans' }, () => {
        fetchArtisans();
      })
      .subscribe();

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterData();
  }, [searchQuery, selectedCategory, selectedCity, showMyListingsOnly, artisans]);

  async function fetchArtisans() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('artisans').select('*').order('id', { ascending: false });
      if (!error && data) {
        setArtisans(data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchReviews(artisanId: number) {
    const { data } = await supabase.from('reviews').select('*').eq('artisan_id', artisanId).order('id', { ascending: false });
    if (data) setReviews(data);
  }

  function filterData() {
    let result = artisans;

    if (showMyListingsOnly && user) {
      result = result.filter((item) => item.user_id === user.id);
    }

    if (selectedCategory !== 'All') {
      result = result.filter((item) => item.trade.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (selectedCity !== 'All Cities') {
      result = result.filter((item) => item.location.toLowerCase().includes(selectedCity.toLowerCase()));
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) => item.name.toLowerCase().includes(q) || item.trade.toLowerCase().includes(q) || item.location.toLowerCase().includes(q)
      );
    }
    setFilteredArtisans(result);
  }

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Camera roll permissions are required to select photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileName = `${Date.now()}_portfolio.jpg`;

      const { data, error } = await supabase.storage.from('portfolios').upload(fileName, blob, {
        contentType: 'image/jpeg',
      });

      if (error) {
        console.error('Storage Upload Error:', error);
        return null;
      }

      const { data: publicUrlData } = supabase.storage.from('portfolios').getPublicUrl(fileName);
      return publicUrlData.publicUrl;
    } catch (err) {
      console.error('Upload catch error:', err);
      return null;
    }
  };

  const handleCall = (phone: string) => Linking.openURL(`tel:${phone}`);

  const handleWhatsApp = (phone: string, name: string) => {
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    cleanPhone = cleanPhone.replace(/^0+/, '');

    if (!cleanPhone.startsWith('233')) {
      cleanPhone = '233' + cleanPhone;
    }

    const message = encodeURIComponent(`Hello ${name}, I found your profile on Artisan Finder!`);
    const whatsappAppUrl = `whatsapp://send?phone=${cleanPhone}&text=${message}`;
    const whatsappWebUrl = `https://wa.me/${cleanPhone}?text=${message}`;

    Linking.canOpenURL(whatsappAppUrl).then((supported) => {
      if (supported) {
        Linking.openURL(whatsappAppUrl);
      } else {
        Linking.openURL(whatsappWebUrl);
      }
    });
  };

  const handleOpenMap = (location: string) => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`);
  };

  async function handleAuth() {
    if (!authEmail || !authPassword) return Alert.alert('Error', 'Please enter email and password.');
    setAuthLoading(true);
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email: authEmail, password: authPassword })
      : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });

    setAuthLoading(false);
    if (error) Alert.alert('Auth Error', error.message);
    else setIsAuthModalVisible(false);
  }

  const handleOpenEdit = (artisan: Artisan) => {
    setEditingArtisanId(artisan.id);
    setNewName(artisan.name);
    setNewTrade(artisan.trade);
    setNewLocation(artisan.location);
    setNewPhone(artisan.phone);
    setNewBio(artisan.bio);
    setImageUri(artisan.image_url || null);
    setSelectedArtisan(null);
    setIsAddModalVisible(true);
  };

  const handleDeleteArtisan = (id: number) => {
    Alert.alert('Delete Listing', 'Are you sure you want to delete this listing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('artisans').delete().eq('id', id);
          if (error) Alert.alert('Error', error.message);
          else {
            setSelectedArtisan(null);
            fetchArtisans();
          }
        },
      },
    ]);
  };

  async function handleSaveArtisan() {
    if (!newName || !newTrade || !newPhone) return Alert.alert('Required', 'Name, Trade, and Phone are required.');
    setSubmitting(true);

    let uploadedUrl = imageUri;

    if (imageUri && imageUri.startsWith('file://')) {
      const remoteUrl = await uploadImage(imageUri);
      if (remoteUrl) uploadedUrl = remoteUrl;
    }

    if (editingArtisanId) {
      const { error } = await supabase
        .from('artisans')
        .update({
          name: newName,
          trade: newTrade,
          location: newLocation || 'Kumasi',
          phone: newPhone,
          bio: newBio || 'No bio provided.',
          image_url: uploadedUrl,
        })
        .eq('id', editingArtisanId);

      setSubmitting(false);
      if (error) Alert.alert('Error', error.message);
      else {
        resetForm();
        fetchArtisans();
      }
    } else {
      const { error } = await supabase.from('artisans').insert([
        {
          name: newName,
          trade: newTrade,
          location: newLocation || 'Kumasi',
          phone: newPhone,
          bio: newBio || 'No bio provided.',
          image_url: uploadedUrl,
          rating: '5.0 ★',
          user_id: user?.id ?? null,
        },
      ]);

      setSubmitting(false);
      if (error) Alert.alert('Error', error.message);
      else {
        resetForm();
        fetchArtisans();
      }
    }
  }

  function resetForm() {
    setIsAddModalVisible(false);
    setEditingArtisanId(null);
    setNewName('');
    setNewTrade('Auto Mechanic');
    setNewLocation('Kumasi');
    setNewPhone('');
    setNewBio('');
    setImageUri(null);
  }

  async function handleAddReview() {
    if (!user) return Alert.alert('Login Required', 'Please log in to leave a review.');
    if (!selectedArtisan) return;
    setReviewSubmitting(true);
    const { error } = await supabase.from('reviews').insert([
      {
        artisan_id: selectedArtisan.id,
        user_email: user.email,
        rating: 5,
        comment: newReviewComment,
      },
    ]);
    setReviewSubmitting(false);
    if (error) Alert.alert('Error', error.message);
    else {
      setNewReviewComment('');
      fetchReviews(selectedArtisan.id);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Find Artisans</Text>
          {user && <Text style={styles.userSubtitle}>Logged in as: {user.email}</Text>}
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {user ? (
            <>
              <TouchableOpacity
                style={[styles.authButton, showMyListingsOnly && styles.activeTabBtn]}
                onPress={() => setShowMyListingsOnly(!showMyListingsOnly)}
              >
                <Text style={styles.authButtonText}>{showMyListingsOnly ? 'All Listings' : 'My Listings'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.authButton} onPress={() => supabase.auth.signOut()}>
                <Text style={styles.authButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.authButton} onPress={() => setIsAuthModalVisible(true)}>
              <Text style={styles.authButtonText}>Login</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addButtonHeader} onPress={() => { resetForm(); setIsAddModalVisible(true); }}>
            <Text style={styles.addButtonHeaderText}>+ Register</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by name, trade, or city..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollWrapper}>
        {CITIES.map((city) => (
          <TouchableOpacity
            key={city}
            style={[styles.cityChip, selectedCity === city && styles.cityChipSelected]}
            onPress={() => setSelectedCity(city)}
          >
            <Text style={[styles.cityChipText, selectedCity === city && styles.cityChipTextSelected]}>📍 {city}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollWrapper}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, selectedCategory === cat && styles.chipSelected]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextSelected]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredArtisans}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={<Text style={styles.emptyText}>No listings found.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              setSelectedArtisan(item);
              fetchReviews(item.id);
            }}
          >
            {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.cardImage} /> : null}
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.rating}>{item.rating}</Text>
            </View>
            <Text style={styles.trade}>{item.trade}</Text>
            <TouchableOpacity onPress={() => handleOpenMap(item.location)}>
              <Text style={styles.location}>📍 {item.location} <Text style={styles.mapLink}>(Map)</Text></Text>
            </TouchableOpacity>
            <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text>
          </TouchableOpacity>
        )}
      />

      {/* DETAIL MODAL */}
      <Modal visible={!!selectedArtisan} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {selectedArtisan && (
              <>
                <TouchableOpacity onPress={() => setSelectedArtisan(null)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕ Close</Text>
                </TouchableOpacity>

                {selectedArtisan.image_url ? (
                  <Image source={{ uri: selectedArtisan.image_url }} style={styles.detailImage} />
                ) : null}

                <Text style={styles.modalName}>{selectedArtisan.name}</Text>
                <Text style={styles.modalTrade}>{selectedArtisan.trade}</Text>
                <Text style={styles.bioText}>{selectedArtisan.bio}</Text>

                {user && selectedArtisan.user_id === user.id && (
                  <View style={styles.ownerActionsRow}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEdit(selectedArtisan)}>
                      <Text style={styles.btnText}>✏️ Edit Listing</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteArtisan(selectedArtisan.id)}>
                      <Text style={styles.btnText}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(selectedArtisan.phone)}>
                    <Text style={styles.btnText}>📞 Call</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.whatsappBtn}
                    onPress={() => handleWhatsApp(selectedArtisan.phone, selectedArtisan.name)}
                  >
                    <Text style={styles.btnText}>💬 WhatsApp</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Reviews & Ratings</Text>
                {reviews.map((r) => (
                  <View key={r.id} style={styles.reviewCard}>
                    <Text style={styles.reviewUser}>{r.user_email} • {'★'.repeat(r.rating)}</Text>
                    <Text style={styles.reviewComment}>{r.comment}</Text>
                  </View>
                ))}

                {user ? (
                  <View style={styles.addReviewForm}>
                    <TextInput
                      style={styles.input}
                      placeholder="Write your review or feedback..."
                      value={newReviewComment}
                      onChangeText={setNewReviewComment}
                    />
                    <TouchableOpacity style={styles.submitButton} onPress={handleAddReview} disabled={reviewSubmitting}>
                      <Text style={styles.submitButtonText}>Submit Review</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.loginHint}>Log in to leave a review for this artisan.</Text>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* REGISTER / EDIT MODAL */}
      <Modal visible={isAddModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <TouchableOpacity onPress={resetForm} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕ Close</Text>
            </TouchableOpacity>

            <Text style={styles.formHeaderTitle}>{editingArtisanId ? 'Edit Listing' : 'Register New Artisan'}</Text>
            
            <TextInput style={styles.input} placeholder="Full Name *" value={newName} onChangeText={setNewName} />
            <TextInput style={styles.input} placeholder="Trade / Specialty *" value={newTrade} onChangeText={setNewTrade} />
            <TextInput style={styles.input} placeholder="Location / City (e.g., Kumasi)" value={newLocation} onChangeText={setNewLocation} />
            <TextInput style={styles.input} placeholder="Phone Number *" value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" />
            <TextInput style={[styles.input, { height: 70 }]} placeholder="Short Bio / Services" value={newBio} onChangeText={setNewBio} multiline />

            <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
              <Text style={styles.imagePickerText}>{imageUri ? '📸 Change Photo' : '📷 Pick Portfolio Photo'}</Text>
            </TouchableOpacity>

            {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : null}

            <TouchableOpacity style={styles.submitButton} onPress={handleSaveArtisan} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>{editingArtisanId ? 'Update Listing' : 'Save Artisan'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* AUTH MODAL */}
      <Modal visible={isAuthModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={() => setIsAuthModalVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕ Close</Text>
            </TouchableOpacity>
            <Text style={styles.formHeaderTitle}>{isSignUp ? 'Sign Up' : 'Log In'}</Text>
            <TextInput style={styles.input} placeholder="Email" value={authEmail} onChangeText={setAuthEmail} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Password" value={authPassword} onChangeText={setAuthPassword} secureTextEntry />
            <TouchableOpacity style={styles.submitButton} onPress={handleAuth} disabled={authLoading}>
              <Text style={styles.submitButtonText}>{isSignUp ? 'Sign Up' : 'Log In'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ alignSelf: 'center', marginTop: 10 }}>
              <Text style={{ color: '#2563eb' }}>{isSignUp ? 'Switch to Login' : 'Create an Account'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8', paddingHorizontal: 16, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  userSubtitle: { fontSize: 10, color: '#6b7280' },
  authButton: { backgroundColor: '#e5e7eb', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  activeTabBtn: { backgroundColor: '#bfdbfe' },
  authButtonText: { fontSize: 11, fontWeight: '600' },
  addButtonHeader: { backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  addButtonHeaderText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  searchInput: { backgroundColor: '#fff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  scrollWrapper: { flexGrow: 0, marginBottom: 8 },
  cityChip: { backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginRight: 6 },
  cityChipSelected: { backgroundColor: '#1e293b' },
  cityChipText: { fontSize: 11, color: '#4b5563' },
  cityChipTextSelected: { color: '#fff', fontWeight: '600' },
  chip: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  chipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 12, color: '#374151' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cardImage: { width: '100%', height: 140, borderRadius: 8, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '700' },
  rating: { color: '#d97706', fontWeight: '600' },
  trade: { color: '#2563eb', fontWeight: '600', fontSize: 13 },
  location: { fontSize: 12, color: '#6b7280', marginVertical: 2 },
  mapLink: { color: '#2563eb', fontWeight: '600' },
  bio: { fontSize: 12, color: '#4b5563', marginTop: 4 },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  closeButton: { alignSelf: 'flex-end', marginBottom: 10 },
  closeButtonText: { color: '#6b7280', fontWeight: '600' },
  detailImage: { width: '100%', height: 180, borderRadius: 10, marginBottom: 12 },
  modalName: { fontSize: 20, fontWeight: '700' },
  modalTrade: { fontSize: 14, color: '#2563eb', fontWeight: '600', marginBottom: 6 },
  bioText: { fontSize: 13, color: '#374151', marginBottom: 16 },
  ownerActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  editBtn: { flex: 1, backgroundColor: '#f59e0b', padding: 10, borderRadius: 8, alignItems: 'center' },
  deleteBtn: { flex: 1, backgroundColor: '#ef4444', padding: 10, borderRadius: 8, alignItems: 'center' },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  callBtn: { flex: 1, backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center' },
  whatsappBtn: { flex: 1, backgroundColor: '#25d366', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  reviewCard: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 6 },
  reviewUser: { fontSize: 11, fontWeight: '600', color: '#111827' },
  reviewComment: { fontSize: 12, color: '#4b5563', marginTop: 2 },
  addReviewForm: { marginTop: 10 },
  loginHint: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic', marginTop: 8 },
  formHeaderTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: { backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 10, fontSize: 13 },
  imagePickerBtn: { backgroundColor: '#e2e8f0', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  imagePickerText: { color: '#334155', fontWeight: '600', fontSize: 13 },
  previewImage: { width: '100%', height: 120, borderRadius: 8, marginBottom: 10 },
  submitButton: { backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  submitButtonText: { color: '#fff', fontWeight: '700' },
});