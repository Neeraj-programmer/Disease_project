import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../services/api';
import { Send, Sparkles, AlertTriangle, Plus, X, Eye, EyeOff, Lock, Unlock, ChevronDown, ChevronUp, Stethoscope, Pill, Flame, Tag, FileText, Lightbulb, XCircle, CheckCircle, ImagePlus, Globe } from 'lucide-react';

const SEVERITY_OPTIONS = [
  { value: 'mild', label: 'Mild', color: 'text-teal-400', bg: 'bg-teal-400/10' },
  { value: 'moderate', label: 'Moderate', color: 'text-primary-400', bg: 'bg-primary-400/10' },
  { value: 'severe', label: 'Severe', color: 'text-accent-400', bg: 'bg-accent-400/10' },
  { value: 'very-severe', label: 'Very Severe', color: 'text-rose-400', bg: 'bg-rose-400/10' },
];

const SUGGESTIONS = {
  triggers: ['Stress','Diet','Weather','Cold','Alcohol','Smoking','Sleep','Anxiety','Gluten','Dairy','Sugar','Humidity','Sunlight','Infection','Hormones'],
  symptoms: ['Redness','Scaling','Itching','Burning','Cracking','Bleeding','Dryness','Swelling','Joint Pain','Nail Changes','Plaques','Flaking'],
  treatments: ['Steroid Cream','Moisturizer','Phototherapy','Methotrexate','Biologics','Coal Tar','Salicylic Acid','Vitamin D','Turmeric','Aloe Vera','Fish Oil','Meditation','Yoga'],
  tags: ['psoriasis','eczema','dermatitis','skincare','flare-up','remission','treatment','diet','lifestyle','mental-health','support','tips'],
};

function TagInput({ items, setItems, suggestions, label, icon: Icon, colorClass }) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const add = (v) => { const t = v.trim().toLowerCase(); if (t && !items.includes(t)) setItems([...items, t]); setInput(''); setOpen(false); };
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-dark-200"><Icon className="w-4 h-4" />{label}</label>
      <div className="relative">
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(input); } }} placeholder="Type and press Enter..." className="input-dark" />
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 glass-strong rounded-xl max-h-40 overflow-y-auto z-20 p-2">
            <div className="flex flex-wrap gap-1">
              {suggestions.filter(s => !items.includes(s.toLowerCase()) && s.toLowerCase().includes(input.toLowerCase())).map(s => (
                <button key={s} type="button" onMouseDown={e => e.preventDefault()} onClick={() => add(s)} className={`tag ${colorClass} cursor-pointer hover:scale-105 transition-transform`}>
                  <Plus className="w-3 h-3" /> {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <span key={item} className={`tag ${colorClass} pr-1`}>{item}
              <button type="button" onClick={() => setItems(items.filter(i => i !== item))} className="ml-1 hover:scale-125 transition-transform"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreatePost() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdv, setShowAdv] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startTimeline: '',
    results: '',
    mistakes: '',
    advice: '',
    severityLevel: 'moderate',
    outcome: '',
    treatmentDuration: '',
    isAnonymous: false,
    isPrivate: false,
  });
  const [symptoms, setSymptoms] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [tags, setTags] = useState([]);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);

  const handleImages = (e) => {
    const files = Array.from(e.target.files).slice(0, 5 - images.length);
    setImages([...images, ...files]);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPreviews([...previews, ...newPreviews]);
  };
  const removeImage = (i) => {
    URL.revokeObjectURL(previews[i]);
    setImages(images.filter((_, idx) => idx !== i));
    setPreviews(previews.filter((_, idx) => idx !== i));
  };

  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.outcome) {
      setError('Title, description, and outcome are required.');
      return;
    }
    setLoading(true); setError('');
    try {
      let res;
      if (images.length > 0) {
        const formData = new FormData();
        Object.entries(form).forEach(([k, v]) => formData.append(k, v));
        symptoms.forEach(s => formData.append('symptoms', s));
        treatments.forEach(t => formData.append('treatments', t));
        triggers.forEach(t => formData.append('triggers', t));
        tags.forEach(t => formData.append('tags', t));
        images.forEach(img => formData.append('images', img));
        res = await createPost(formData);
      } else {
        res = await createPost({ ...form, symptoms, treatments, triggers, tags });
      }
      navigate(`/post/${res.data.post._id}`);
    } catch (err) { setError(err.response?.data?.error || 'Failed to create post'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-primary-500 flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-white">Share Your Experience</h1><p className="text-sm text-dark-300">Your story can help others on their journey</p></div>
      </div>

      {error && <div className="glass rounded-xl p-4 mb-6 border-rose-500/30 flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" /><p className="text-rose-400 text-sm">{error}</p></div>}

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="glass rounded-2xl p-6 space-y-5">
          <div className="rounded-xl border border-amber-300/30 bg-amber-100/40 p-3 text-sm text-amber-900">
            No doctor/hospital promotion, contact details, affiliate links, or guaranteed cure claims are allowed.
          </div>
          <div><label className="flex items-center gap-2 text-sm font-medium text-dark-200 mb-2"><FileText className="w-4 h-4" />Title</label>
            <input type="text" name="title" value={form.title} onChange={onChange} placeholder="e.g., My 6-month journey with scalp psoriasis..." className="input-dark text-lg" id="create-title" required /></div>
          <div><label className="flex items-center gap-2 text-sm font-medium text-dark-200 mb-2"><FileText className="w-4 h-4" />Your Story</label>
            <textarea name="description" value={form.description} onChange={onChange} placeholder="Share your experience in detail..." rows={6} className="input-dark resize-y" id="create-description" required /></div>
          <div><label className="text-sm font-medium text-dark-200 mb-3 block">Severity Level</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SEVERITY_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setForm({ ...form, severityLevel: opt.value })}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${form.severityLevel === opt.value ? `${opt.bg} ${opt.color} border border-current` : 'bg-white/5 text-dark-400 border border-white/5 hover:bg-white/8'}`}>{opt.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-dark-200 mb-2 block">Treatment Duration</label>
              <input type="text" name="treatmentDuration" value={form.treatmentDuration} onChange={onChange} placeholder="e.g., 8 weeks" className="input-dark" />
            </div>
            <div>
              <label className="text-sm font-medium text-dark-200 mb-2 block">Outcome *</label>
              <select name="outcome" value={form.outcome} onChange={onChange} className="input-dark" required>
                <option value="">Select outcome</option>
                <option value="improved">Improved</option>
                <option value="no-change">No Change</option>
                <option value="worse">Worse</option>
              </select>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 space-y-5">
          <TagInput items={symptoms} setItems={setSymptoms} suggestions={SUGGESTIONS.symptoms} label="Symptoms" icon={Stethoscope} colorClass="tag-rose" />
          <TagInput items={treatments} setItems={setTreatments} suggestions={SUGGESTIONS.treatments} label="Treatments" icon={Pill} colorClass="tag-teal" />
          <TagInput items={triggers} setItems={setTriggers} suggestions={SUGGESTIONS.triggers} label="Triggers" icon={Flame} colorClass="tag-accent" />
          <TagInput items={tags} setItems={setTags} suggestions={SUGGESTIONS.tags} label="Tags" icon={Tag} colorClass="tag-primary" />
        </div>

        {/* Image Upload */}
        <div className="glass rounded-2xl p-6">
          <label className="flex items-center gap-2 text-sm font-medium text-dark-200 mb-3"><ImagePlus className="w-4 h-4" />Images (up to 5)</label>
          <div className="flex flex-wrap gap-3">
            {previews.map((src, i) => (
              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden group">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <label className="w-24 h-24 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-teal-400/30 hover:bg-white/3 transition-all">
                <ImagePlus className="w-6 h-6 text-dark-400" />
                <span className="text-xs text-dark-500 mt-1">Add</span>
                <input type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
              </label>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          <button type="button" onClick={() => setShowAdv(!showAdv)} className="w-full flex items-center justify-between px-6 py-4 text-dark-200 hover:text-white transition-colors">
            <span className="font-medium text-sm">Additional Details</span>{showAdv ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showAdv && (
            <div className="px-6 pb-6 space-y-4 animate-fade-in-up">
              <div><label className="text-sm font-medium text-dark-200 mb-2 block">Timeline</label><input type="text" name="startTimeline" value={form.startTimeline} onChange={onChange} placeholder="e.g., 3 years ago" className="input-dark" /></div>
              <div><label className="flex items-center gap-2 text-sm font-medium text-dark-200 mb-2"><CheckCircle className="w-4 h-4 text-teal-400" />Results</label><textarea name="results" value={form.results} onChange={onChange} placeholder="What results have you seen?" rows={3} className="input-dark resize-y" /></div>
              <div><label className="flex items-center gap-2 text-sm font-medium text-dark-200 mb-2"><XCircle className="w-4 h-4 text-rose-400" />Mistakes</label><textarea name="mistakes" value={form.mistakes} onChange={onChange} placeholder="What didn't work?" rows={3} className="input-dark resize-y" /></div>
              <div><label className="flex items-center gap-2 text-sm font-medium text-dark-200 mb-2"><Lightbulb className="w-4 h-4 text-primary-400" />Advice</label><textarea name="advice" value={form.advice} onChange={onChange} placeholder="What advice would you give?" rows={3} className="input-dark resize-y" /></div>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6 flex flex-wrap gap-4">
          <button type="button" onClick={() => setForm({ ...form, isAnonymous: !form.isAnonymous })}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${form.isAnonymous ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' : 'bg-white/5 text-dark-400 border border-white/5 hover:bg-white/8'}`}>
            {form.isAnonymous ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}{form.isAnonymous ? 'Anonymous' : 'With Name'}
          </button>
          <button type="button" onClick={() => setForm({ ...form, isPrivate: !form.isPrivate })}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${form.isPrivate ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'}`}>
            {form.isPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}{form.isPrivate ? 'Private' : 'Public'}
          </button>
        </div>

        <button type="submit" disabled={loading} id="create-submit" className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base disabled:opacity-50">
          {loading ? <><div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />Sharing...</> : <><Send className="w-5 h-5" />Share Experience</>}
        </button>
      </form>
    </div>
  );
}
