import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { updateUserProfile, uploadProfilePhoto } from '@/lib/firestore';

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();

  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio ?? '');
    }
  }, [profile]);

  if (loading || !user || !profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const currentPhotoURL = photoPreview ?? profile.photoURL ?? user.photoURL ?? '';

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
    setError('');
    setSuccess('');
    setUploadingPhoto(true);

    try {
      const downloadURL = await uploadProfilePhoto(user.uid, file);
      await updateUserProfile(user.uid, { photoURL: downloadURL });
      await refreshProfile();
      setPhotoPreview(null);
      setSuccess('Profile photo updated!');
    } catch (err) {
      console.error(err);
      setPhotoPreview(null);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveBio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateUserProfile(user.uid, { bio: bio.trim() });
      await refreshProfile();
      setSuccess('Profile saved!');
    } catch (err) {
      console.error(err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <button
          onClick={() => router.push('/calendar')}
          style={{ background: 'none', color: 'var(--color-muted)', fontSize: '1.2rem', padding: '4px 8px' }}
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>My Profile</h1>
      </div>

      {error && (
        <p style={{ color: '#e53e3e', marginBottom: 16, fontSize: '0.9rem', background: 'rgba(229,62,62,0.1)', padding: '10px 14px', borderRadius: 8 }}>
          {error}
        </p>
      )}
      {success && (
        <p style={{ color: 'var(--color-primary)', marginBottom: 16, fontSize: '0.9rem', background: 'rgba(29,185,84,0.1)', padding: '10px 14px', borderRadius: 8 }}>
          ✓ {success}
        </p>
      )}

      {/* Photo section */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-card)', padding: 24, marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '1rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Profile Photo
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ position: 'relative' }}>
            {currentPhotoURL ? (
              <Image
                src={currentPhotoURL}
                alt={profile.displayName ?? 'User'}
                width={80}
                height={80}
                style={{ borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '2rem',
                color: '#000',
              }}>
                {(profile.displayName ?? user.displayName ?? 'U')[0].toUpperCase()}
              </div>
            )}
            {uploadingPhoto && (
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{ width: 24, height: 24, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
          </div>
          <div>
            <button
              className="btn-ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              style={{ fontSize: '0.9rem', padding: '8px 16px' }}
            >
              {uploadingPhoto ? 'Uploading…' : 'Upload Photo'}
            </button>
            <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              JPG, PNG or WebP, max 5 MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Info section */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-card)', padding: 24, marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '1rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Info
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Name</span>
          <span style={{ fontWeight: 600 }}>{profile.displayName ?? user.displayName}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Email</span>
          <span style={{ color: 'var(--color-muted)' }}>{profile.email ?? user.email}</span>
        </div>
      </div>

      {/* Bio section */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-card)', padding: 24 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '1rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Bio
        </h2>
        <form onSubmit={handleSaveBio}>
          <div className="field" style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>A little about you</span>
              <span style={{ fontSize: '0.75rem', color: bio.length >= 160 ? '#e53e3e' : 'var(--color-muted)' }}>
                {bio.length}/160
              </span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              placeholder="Share a little about yourself…"
              rows={4}
              maxLength={160}
              style={{
                resize: 'vertical',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '10px 12px',
                width: '100%',
                fontSize: '0.95rem',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '10px 24px' }}>
              {saving ? 'Saving…' : 'Save Bio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
