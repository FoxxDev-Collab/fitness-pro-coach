import { useState, useEffect, useRef } from 'react';
import { User, Dumbbell, ClipboardList, BarChart3, Plus, Edit2, Trash2, ChevronRight, X, AlertTriangle, Check, TrendingUp, Calendar, ChevronLeft, Ruler, Scale, Play, Clock, MessageSquare, GripVertical, ChevronDown, Copy, ArrowLeft, Image, FileText, Activity } from 'lucide-react';

const defaultExercises = [
  { id: 'ex1', name: 'Barbell Back Squat', category: 'Strength', muscles: ['Quads', 'Glutes', 'Core'], equipment: 'Barbell', type: 'weight', instructions: 'Stand with feet shoulder-width apart. Bar rests on upper back. Bend knees and hips to lower down, keeping chest up. Drive through heels to stand.' },
  { id: 'ex2', name: 'Bench Press', category: 'Strength', muscles: ['Chest', 'Triceps', 'Shoulders'], equipment: 'Barbell', type: 'weight', instructions: 'Lie on bench, grip bar slightly wider than shoulders. Lower bar to chest, then press up to full extension.' },
  { id: 'ex3', name: 'Deadlift', category: 'Strength', muscles: ['Back', 'Glutes', 'Hamstrings'], equipment: 'Barbell', type: 'weight', instructions: 'Stand with feet hip-width, bar over midfoot. Hinge at hips, grip bar. Drive through floor, keeping back flat, until standing.' },
  { id: 'ex4', name: 'Pull-ups', category: 'Strength', muscles: ['Back', 'Biceps'], equipment: 'Pull-up Bar', type: 'weight', instructions: 'Hang from bar with overhand grip. Pull body up until chin clears bar. Lower with control.' },
  { id: 'ex5', name: 'Overhead Press', category: 'Strength', muscles: ['Shoulders', 'Triceps'], equipment: 'Barbell', type: 'weight', instructions: 'Stand with bar at shoulders. Press overhead to full lockout. Lower with control.' },
  { id: 'ex6', name: 'Barbell Row', category: 'Strength', muscles: ['Back', 'Biceps'], equipment: 'Barbell', type: 'weight', instructions: 'Hinge forward at hips, back flat. Pull bar to lower chest, squeezing shoulder blades. Lower with control.' },
  { id: 'ex7', name: 'Lunges', category: 'Strength', muscles: ['Quads', 'Glutes'], equipment: 'Dumbbells', type: 'weight', instructions: 'Step forward into a lunge, lowering back knee toward floor. Push through front heel to return.' },
  { id: 'ex8', name: 'Dumbbell Curl', category: 'Strength', muscles: ['Biceps'], equipment: 'Dumbbells', type: 'weight', instructions: 'Stand with dumbbells at sides. Curl weights up, keeping elbows stationary. Lower with control.' },
  { id: 'ex9', name: 'Tricep Pushdown', category: 'Strength', muscles: ['Triceps'], equipment: 'Cable', type: 'weight', instructions: 'Stand at cable machine, grip bar. Push down until arms are straight. Return with control.' },
  { id: 'ex10', name: 'Leg Press', category: 'Strength', muscles: ['Quads', 'Glutes'], equipment: 'Machine', type: 'weight', instructions: 'Sit in machine, feet shoulder-width on platform. Lower weight by bending knees, then press back up.' },
  { id: 'ex11', name: 'Treadmill Run', category: 'Cardio', muscles: ['Full Body'], equipment: 'Treadmill', type: 'cardio', instructions: 'Maintain steady pace with good posture. Land midfoot, keep arms relaxed.' },
  { id: 'ex12', name: 'Rowing Machine', category: 'Cardio', muscles: ['Full Body'], equipment: 'Rower', type: 'cardio', instructions: 'Drive with legs first, then lean back slightly and pull handle to chest. Return in reverse order.' },
  { id: 'ex13', name: 'Cycling', category: 'Cardio', muscles: ['Legs'], equipment: 'Bike', type: 'cardio', instructions: 'Maintain steady cadence. Adjust resistance for desired intensity.' },
  { id: 'ex14', name: 'Jump Rope', category: 'Cardio', muscles: ['Full Body'], equipment: 'Jump Rope', type: 'cardio', instructions: 'Jump with feet together, using wrists to turn rope. Land softly on balls of feet.' },
  { id: 'ex15', name: 'Plank', category: 'Core', muscles: ['Core'], equipment: 'None', type: 'timed', instructions: 'Support body on forearms and toes. Keep body in straight line, core tight.' },
  { id: 'ex16', name: 'Russian Twist', category: 'Core', muscles: ['Core', 'Obliques'], equipment: 'None', type: 'weight', instructions: 'Sit with knees bent, lean back slightly. Rotate torso side to side, keeping core engaged.' },
];

const initialData = { clients: [], exercises: defaultExercises, programs: [], assignments: [], logs: [], measurements: [] };

export default function FitCoachPro() {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('fitcoach-data-v6');
    return saved ? JSON.parse(saved) : initialData;
  });
  const [view, setView] = useState({ type: 'tabs', tab: 'clients' });
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [liveSession, setLiveSession] = useState(null);

  useEffect(() => { localStorage.setItem('fitcoach-data-v6', JSON.stringify(data)); }, [data]);

  const update = (key, value) => setData(d => ({ ...d, [key]: value }));
  const genId = () => Math.random().toString(36).substr(2, 9);

  const saveClient = (client) => {
    if (client.id) update('clients', data.clients.map(c => c.id === client.id ? client : c));
    else update('clients', [...data.clients, { ...client, id: genId(), createdAt: new Date().toISOString() }]);
    setModal(null);
  };
  const deleteClient = (id) => {
    update('clients', data.clients.filter(c => c.id !== id));
    update('assignments', data.assignments.filter(a => a.clientId !== id));
    update('measurements', data.measurements.filter(m => m.clientId !== id));
    setSelected(null);
  };

  const saveExercise = (exercise) => {
    if (exercise.id && data.exercises.find(e => e.id === exercise.id)) {
      update('exercises', data.exercises.map(e => e.id === exercise.id ? exercise : e));
    } else {
      update('exercises', [...data.exercises, { ...exercise, id: genId(), custom: true }]);
    }
    setView({ type: 'tabs', tab: 'exercises' });
  };
  const deleteExercise = (id) => update('exercises', data.exercises.filter(e => e.id !== id));

  const saveProgram = (program) => {
    if (program.id && data.programs.find(p => p.id === program.id)) update('programs', data.programs.map(p => p.id === program.id ? program : p));
    else update('programs', [...data.programs, { ...program, id: genId() }]);
    setView({ type: 'tabs', tab: 'programs' });
  };
  const deleteProgram = (id) => update('programs', data.programs.filter(p => p.id !== id));

  const saveAssignment = (assignment) => {
    if (assignment.id) update('assignments', data.assignments.map(a => a.id === assignment.id ? assignment : a));
    else update('assignments', [...data.assignments, { ...assignment, id: genId(), assignedAt: new Date().toISOString() }]);
    setModal(null);
  };
  const deleteAssignment = (id) => {
    update('assignments', data.assignments.filter(a => a.id !== id));
    update('logs', data.logs.filter(l => l.assignmentId !== id));
  };

  const saveLog = (log) => {
    update('logs', [...data.logs, { ...log, id: genId(), date: log.date || new Date().toISOString() }]);
    setLiveSession(null);
  };

  const saveMeasurement = (measurement) => {
    update('measurements', [...data.measurements, { ...measurement, id: genId() }]);
    setModal(null);
  };
  const deleteMeasurement = (id) => update('measurements', data.measurements.filter(m => m.id !== id));

  const startLiveSession = (client, assignment, workoutIdx) => {
    const workout = assignment.workouts[workoutIdx];
    setLiveSession({
      clientId: client.id, clientName: client.name, clientHealth: client.healthConditions,
      assignmentId: assignment.id, assignmentName: assignment.name, workoutIdx, workout,
      currentExercise: 0, exercises: workout.exercises.map(ex => ({ ...ex, actualSets: [], notes: '' })),
      sessionNotes: '', startTime: Date.now()
    });
  };

  const getExerciseHistory = (exerciseId) => {
    const history = [];
    data.logs.forEach(log => {
      const assignment = data.assignments.find(a => a.id === log.assignmentId);
      const client = data.clients.find(c => c.id === assignment?.clientId);
      const workout = assignment?.workouts?.[log.workoutIdx];
      if (workout && log.exercises) {
        Object.entries(log.exercises).forEach(([idx, perf]) => {
          const ex = workout.exercises?.[parseInt(idx)];
          if (ex?.exerciseId === exerciseId || ex?.name === data.exercises.find(e => e.id === exerciseId)?.name) {
            history.push({ date: log.date, clientId: client?.id, clientName: client?.name, ...perf });
          }
        });
      }
    });
    return history.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  if (liveSession) return <LiveSessionView session={liveSession} setSession={setLiveSession} onSave={saveLog} />;
  if (view.type === 'programEditor') return <ProgramEditorPage program={view.program} exercises={data.exercises} onSave={saveProgram} onCancel={() => setView({ type: 'tabs', tab: 'programs' })} onCreateExercise={() => setView({ type: 'exerciseEditor', exercise: null, returnTo: view })} />;
  if (view.type === 'exerciseEditor') return <ExerciseEditorPage exercise={view.exercise} onSave={saveExercise} onCancel={() => setView(view.returnTo || { type: 'tabs', tab: 'exercises' })} />;
  if (view.type === 'exerciseDetail') return <ExerciseDetailPage exercise={view.exercise} history={getExerciseHistory(view.exercise.id)} clients={data.clients} onEdit={() => setView({ type: 'exerciseEditor', exercise: view.exercise, returnTo: { type: 'tabs', tab: 'exercises' } })} onBack={() => setView({ type: 'tabs', tab: 'exercises' })} onDelete={() => { deleteExercise(view.exercise.id); setView({ type: 'tabs', tab: 'exercises' }); }} />;

  const tabs = [
    { id: 'clients', label: 'Clients', icon: User },
    { id: 'exercises', label: 'Exercises', icon: Dumbbell },
    { id: 'programs', label: 'Programs', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gradient-to-r from-purple-700 to-indigo-700 p-4 shadow-lg">
        <h1 className="text-2xl font-bold">FitCoach Pro</h1>
      </header>
      <nav className="flex border-b border-gray-700 bg-gray-800">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setView({ type: 'tabs', tab: t.id }); setSelected(null); }}
            className={`flex-1 p-3 flex items-center justify-center gap-2 text-sm font-medium transition ${view.tab === t.id ? 'bg-gray-700 text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-200'}`}>
            <t.icon size={18} /> <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </nav>
      <main className="p-4 max-w-4xl mx-auto">
        {view.tab === 'clients' && <ClientsTab data={data} selected={selected} setSelected={setSelected} onAdd={() => setModal({ type: 'client' })} onEdit={c => setModal({ type: 'client', data: c })} onDelete={deleteClient} onAssign={c => setModal({ type: 'assign', clientId: c.id })} onStartSession={startLiveSession} onEditAssignment={a => setModal({ type: 'editAssignment', data: a })} onDeleteAssignment={deleteAssignment} onAddMeasurement={c => setModal({ type: 'measurement', clientId: c.id })} onDeleteMeasurement={deleteMeasurement} />}
        {view.tab === 'exercises' && <ExercisesTab exercises={data.exercises} onNew={() => setView({ type: 'exerciseEditor', exercise: null })} onView={e => setView({ type: 'exerciseDetail', exercise: e })} onDelete={deleteExercise} />}
        {view.tab === 'programs' && <ProgramsTab programs={data.programs} assignments={data.assignments} clients={data.clients} onNew={() => setView({ type: 'programEditor', program: { name: '', description: '', workouts: [] } })} onEdit={p => setView({ type: 'programEditor', program: p })} onDelete={deleteProgram} onDuplicate={p => setView({ type: 'programEditor', program: { ...p, id: null, name: `${p.name} (Copy)` } })} onAssign={p => setModal({ type: 'assignFromProgram', program: p })} />}
        {view.tab === 'reports' && <ReportsTab data={data} />}
      </main>
      {modal?.type === 'client' && <ClientModal client={modal.data} onSave={saveClient} onClose={() => setModal(null)} />}
      {modal?.type === 'assign' && <AssignModal clientId={modal.clientId} programs={data.programs} clients={data.clients} onSave={saveAssignment} onClose={() => setModal(null)} />}
      {modal?.type === 'assignFromProgram' && <AssignFromProgramModal program={modal.program} clients={data.clients} onSave={saveAssignment} onClose={() => setModal(null)} />}
      {modal?.type === 'editAssignment' && <EditAssignmentModal assignment={modal.data} exercises={data.exercises} onSave={saveAssignment} onClose={() => setModal(null)} />}
      {modal?.type === 'measurement' && <MeasurementModal clientId={modal.clientId} onSave={saveMeasurement} onClose={() => setModal(null)} />}
    </div>
  );
}

// ============ EXERCISES ============

function ExercisesTab({ exercises, onNew, onView, onDelete }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const categories = ['All', ...new Set(exercises.map(e => e.category))];
  const filtered = exercises.filter(e => 
    (filter === 'All' || e.category === filter) &&
    (search === '' || e.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Exercise Library</h2>
          <p className="text-gray-400 text-sm">{exercises.length} exercises</p>
        </div>
        <button onClick={onNew} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
          <Plus size={20} /> New Exercise
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search exercises..."
          className="w-full bg-gray-800 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-lg text-sm ${filter === c ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>{c}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-700">
          <Dumbbell size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">No exercises found</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(e => (
            <div key={e.id} onClick={() => onView(e)} className="bg-gray-800 rounded-xl p-4 cursor-pointer hover:bg-gray-750 border border-transparent hover:border-purple-500/50 transition group">
              <div className="flex gap-3">
                <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  {e.image ? (
                    <img src={e.image} alt={e.name} className="w-full h-full object-cover" />
                  ) : (
                    <Dumbbell size={24} className="text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold group-hover:text-purple-400 transition">{e.name}</p>
                      <p className="text-sm text-gray-400">{e.category} · {e.equipment}</p>
                    </div>
                    {e.custom && <span className="text-xs bg-purple-900 text-purple-300 px-2 py-0.5 rounded">Custom</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{e.muscles?.join(', ')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciseEditorPage({ exercise, onSave, onCancel }) {
  const [form, setForm] = useState(exercise || { name: '', category: 'Strength', muscles: [], equipment: '', type: 'weight', instructions: '', image: '', tips: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const muscleOpts = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Core', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Full Body'];

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => set('image', reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={onCancel} className="p-2 hover:bg-gray-700 rounded-lg"><ArrowLeft size={20} /></button>
            <h1 className="text-xl font-bold">{exercise ? 'Edit Exercise' : 'New Exercise'}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Cancel</button>
            <button onClick={() => form.name && onSave(form)} disabled={!form.name} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 rounded-lg font-medium">
              Save Exercise
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Image Upload */}
          <div className="md:col-span-1">
            <label className="block text-sm text-gray-400 mb-2">Exercise Image</label>
            <div className="aspect-square bg-gray-800 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center overflow-hidden relative group">
              {form.image ? (
                <>
                  <img src={form.image} alt="Exercise" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <button onClick={() => set('image', '')} className="bg-red-600 px-3 py-1 rounded text-sm">Remove</button>
                  </div>
                </>
              ) : (
                <label className="cursor-pointer text-center p-4">
                  <Image size={32} className="mx-auto text-gray-500 mb-2" />
                  <p className="text-sm text-gray-400">Click to upload</p>
                  <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Main Info */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Exercise Name *</label>
              <input className="w-full bg-gray-800 rounded-lg p-3 outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g., Barbell Back Squat" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Category</label>
                <select className="w-full bg-gray-800 rounded-lg p-3" value={form.category} onChange={e => set('category', e.target.value)}>
                  <option>Strength</option><option>Cardio</option><option>Core</option><option>Flexibility</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Type</label>
                <select className="w-full bg-gray-800 rounded-lg p-3" value={form.type} onChange={e => set('type', e.target.value)}>
                  <option value="weight">Weight (sets/reps/lbs)</option>
                  <option value="cardio">Cardio (duration/distance)</option>
                  <option value="timed">Timed (duration)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Equipment</label>
              <input className="w-full bg-gray-800 rounded-lg p-3" placeholder="e.g., Barbell, Dumbbells, None" value={form.equipment} onChange={e => set('equipment', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Muscle Groups</label>
              <div className="flex flex-wrap gap-2">
                {muscleOpts.map(m => (
                  <button key={m} type="button" onClick={() => set('muscles', form.muscles?.includes(m) ? form.muscles.filter(x => x !== m) : [...(form.muscles || []), m])}
                    className={`px-3 py-1.5 rounded-lg text-sm ${form.muscles?.includes(m) ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>{m}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-purple-400" />
            <h3 className="font-semibold">How To Perform</h3>
          </div>
          <textarea
            className="w-full bg-gray-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-purple-500"
            rows={4}
            placeholder="Step-by-step instructions for performing this exercise correctly..."
            value={form.instructions || ''}
            onChange={e => set('instructions', e.target.value)}
          />
        </div>

        {/* Tips */}
        <div className="mt-4 bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-yellow-400" />
            <h3 className="font-semibold">Coaching Tips & Common Mistakes</h3>
          </div>
          <textarea
            className="w-full bg-gray-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-purple-500"
            rows={3}
            placeholder="Tips for coaches, common mistakes to watch for, cues to give clients..."
            value={form.tips || ''}
            onChange={e => set('tips', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function ExerciseDetailPage({ exercise, history, clients, onEdit, onBack, onDelete }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const clientStats = {};
  history.forEach(h => {
    if (!h.clientId) return;
    if (!clientStats[h.clientId]) clientStats[h.clientId] = { name: h.clientName, sessions: 0, maxWeight: 0, totalVolume: 0 };
    clientStats[h.clientId].sessions++;
    if (h.weight > clientStats[h.clientId].maxWeight) clientStats[h.clientId].maxWeight = h.weight;
    if (h.setDetails) {
      h.setDetails.forEach(s => { clientStats[h.clientId].totalVolume += (s.weight || 0) * (s.reps || 0); });
    }
  });

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-700 rounded-lg"><ArrowLeft size={20} /></button>
            <h1 className="text-xl font-bold">{exercise.name}</h1>
          </div>
          <div className="flex gap-2">
            {exercise.custom && (
              <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 bg-red-900/50 hover:bg-red-800 rounded-lg text-sm">Delete</button>
            )}
            <button onClick={onEdit} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium">Edit</button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Image & Basic Info */}
          <div className="md:col-span-1">
            <div className="aspect-square bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden mb-4">
              {exercise.image ? (
                <img src={exercise.image} alt={exercise.name} className="w-full h-full object-cover" />
              ) : (
                <Dumbbell size={48} className="text-gray-600" />
              )}
            </div>
            <div className="bg-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex justify-between"><span className="text-gray-400">Category</span><span>{exercise.category}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Type</span><span className="capitalize">{exercise.type}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Equipment</span><span>{exercise.equipment || 'None'}</span></div>
              <div><span className="text-gray-400 block mb-1">Muscles</span><div className="flex flex-wrap gap-1">{exercise.muscles?.map(m => <span key={m} className="bg-gray-700 px-2 py-0.5 rounded text-sm">{m}</span>)}</div></div>
              {exercise.custom && <div className="text-xs text-purple-400 pt-2 border-t border-gray-700">Custom Exercise</div>}
            </div>
          </div>

          {/* Instructions & Tips */}
          <div className="md:col-span-2 space-y-4">
            {exercise.instructions && (
              <div className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={18} className="text-purple-400" />
                  <h3 className="font-semibold">How To Perform</h3>
                </div>
                <p className="text-gray-300 whitespace-pre-wrap">{exercise.instructions}</p>
              </div>
            )}

            {exercise.tips && (
              <div className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={18} className="text-yellow-400" />
                  <h3 className="font-semibold">Coaching Tips</h3>
                </div>
                <p className="text-gray-300 whitespace-pre-wrap">{exercise.tips}</p>
              </div>
            )}

            {/* Client Performance Data */}
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={18} className="text-green-400" />
                <h3 className="font-semibold">Client Performance Data</h3>
              </div>
              {Object.keys(clientStats).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No session data yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(clientStats).map(([clientId, stats]) => (
                    <div key={clientId} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{stats.name}</span>
                        <span className="text-sm text-gray-400">{stats.sessions} sessions</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-400">Max Weight:</span> <span className="text-green-400">{stats.maxWeight} lbs</span></div>
                        <div><span className="text-gray-400">Total Volume:</span> <span className="text-blue-400">{stats.totalVolume.toLocaleString()} lbs</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent History */}
            {history.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={18} className="text-blue-400" />
                  <h3 className="font-semibold">Recent Sessions</h3>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.slice(0, 10).map((h, i) => (
                    <div key={i} className="bg-gray-700 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{h.clientName}</p>
                        <p className="text-xs text-gray-400">{new Date(h.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right text-sm">
                        {h.setDetails ? (
                          <span className="text-gray-300">{h.setDetails.length} sets · max {Math.max(...h.setDetails.map(s => s.weight || 0))} lbs</span>
                        ) : h.weight ? (
                          <span className="text-gray-300">{h.sets}×{h.reps} @ {h.weight} lbs</span>
                        ) : (
                          <span className="text-gray-400">{h.duration} min</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm">
            <h3 className="text-lg font-semibold mb-2">Delete Exercise?</h3>
            <p className="text-gray-400 mb-4">This will permanently delete "{exercise.name}". This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg">Cancel</button>
              <button onClick={onDelete} className="flex-1 bg-red-600 hover:bg-red-500 py-2 rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ PROGRAMS ============

function ProgramsTab({ programs, assignments, clients, onNew, onEdit, onDelete, onDuplicate, onAssign }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Programs</h2>
          <p className="text-gray-400 text-sm">{programs.length} program{programs.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={onNew} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
          <Plus size={20} /> New Program
        </button>
      </div>

      {programs.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-700">
          <ClipboardList size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No programs yet</h3>
          <p className="text-gray-500 mb-4">Create your first workout program to get started</p>
          <button onClick={onNew} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg inline-flex items-center gap-2">
            <Plus size={18} /> Create Program
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {programs.map(p => {
            const assignedClients = assignments.filter(a => a.programId === p.id);
            const totalExercises = p.workouts?.reduce((sum, w) => sum + (w.exercises?.length || 0), 0) || 0;
            return (
              <div key={p.id} className="bg-gray-800 rounded-xl p-5 hover:bg-gray-800/80 transition group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 cursor-pointer" onClick={() => onEdit(p)}>
                    <h3 className="text-xl font-semibold group-hover:text-purple-400 transition">{p.name}</h3>
                    {p.description && <p className="text-gray-400 text-sm mt-1">{p.description}</p>}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => onDuplicate(p)} className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600" title="Duplicate"><Copy size={16} /></button>
                    <button onClick={() => onEdit(p)} className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600" title="Edit"><Edit2 size={16} /></button>
                    <button onClick={() => onDelete(p.id)} className="p-2 bg-red-900/50 rounded-lg hover:bg-red-800" title="Delete"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
                  <span className="flex items-center gap-1"><ClipboardList size={14} /> {p.workouts?.length || 0} workouts</span>
                  <span className="flex items-center gap-1"><Dumbbell size={14} /> {totalExercises} exercises</span>
                  <span className="flex items-center gap-1"><User size={14} /> {assignedClients.length} assigned</span>
                </div>
                {p.workouts?.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-4">
                    {p.workouts.map((w, i) => <span key={i} className="bg-gray-700 px-3 py-1 rounded-full text-sm">{w.name}</span>)}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => onAssign(p)} className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><User size={16} /> Assign</button>
                  <button onClick={() => onEdit(p)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium">Edit</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProgramEditorPage({ program, exercises, onSave, onCancel, onCreateExercise }) {
  const [form, setForm] = useState(program);
  const [activeWorkout, setActiveWorkout] = useState(0);
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
  const [exerciseFilter, setExerciseFilter] = useState('All');
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [draggedExercise, setDraggedExercise] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowExerciseDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories = ['All', ...new Set(exercises.map(e => e.category))];
  const filteredExercises = exercises.filter(e => 
    (exerciseFilter === 'All' || e.category === exerciseFilter) &&
    (exerciseSearch === '' || e.name.toLowerCase().includes(exerciseSearch.toLowerCase()))
  );

  const addWorkout = () => {
    const newWorkout = { name: `Workout ${(form.workouts?.length || 0) + 1}`, exercises: [] };
    setForm(f => ({ ...f, workouts: [...(f.workouts || []), newWorkout] }));
    setActiveWorkout(form.workouts?.length || 0);
  };

  const updateWorkout = (idx, updates) => setForm(f => ({ ...f, workouts: f.workouts.map((w, i) => i === idx ? { ...w, ...updates } : w) }));
  const deleteWorkout = (idx) => { setForm(f => ({ ...f, workouts: f.workouts.filter((_, i) => i !== idx) })); if (activeWorkout >= idx && activeWorkout > 0) setActiveWorkout(activeWorkout - 1); };
  const duplicateWorkout = (idx) => {
    const w = form.workouts[idx];
    setForm(f => ({ ...f, workouts: [...f.workouts.slice(0, idx + 1), { ...w, name: `${w.name} (Copy)`, exercises: w.exercises.map(e => ({ ...e })) }, ...f.workouts.slice(idx + 1)] }));
    setActiveWorkout(idx + 1);
  };

  const addExerciseToWorkout = (exercise) => {
    const newEx = { exerciseId: exercise.id, name: exercise.name, type: exercise.type, category: exercise.category, sets: 3, reps: 10, weight: 0, duration: 0, distance: 0, rest: 60, notes: '' };
    updateWorkout(activeWorkout, { exercises: [...(form.workouts[activeWorkout]?.exercises || []), newEx] });
    setShowExerciseDropdown(false);
    setExerciseSearch('');
  };

  const updateExercise = (exIdx, updates) => {
    const exs = form.workouts[activeWorkout].exercises.map((e, i) => i === exIdx ? { ...e, ...updates } : e);
    updateWorkout(activeWorkout, { exercises: exs });
  };
  const deleteExercise = (exIdx) => updateWorkout(activeWorkout, { exercises: form.workouts[activeWorkout].exercises.filter((_, i) => i !== exIdx) });

  const handleDragStart = (e, idx) => { setDraggedExercise(idx); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e, idx) => { e.preventDefault(); if (draggedExercise !== null && draggedExercise !== idx) setDragOverIndex(idx); };
  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (draggedExercise !== null && draggedExercise !== idx) {
      const exs = [...form.workouts[activeWorkout].exercises];
      const [removed] = exs.splice(draggedExercise, 1);
      exs.splice(idx, 0, removed);
      updateWorkout(activeWorkout, { exercises: exs });
    }
    setDraggedExercise(null); setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDraggedExercise(null); setDragOverIndex(null); };

  const currentWorkout = form.workouts?.[activeWorkout];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={onCancel} className="p-2 hover:bg-gray-700 rounded-lg"><ArrowLeft size={20} /></button>
            <div>
              <input className="bg-transparent text-xl font-bold border-none outline-none focus:ring-2 focus:ring-purple-500 rounded px-2 -ml-2" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Program Name" />
              <input className="block bg-transparent text-sm text-gray-400 border-none outline-none focus:ring-2 focus:ring-purple-500 rounded px-2 -ml-2 w-full" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Add description..." />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Cancel</button>
            <button onClick={() => form.name && onSave(form)} disabled={!form.name} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 rounded-lg font-medium">Save</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 flex gap-4">
        <div className="w-64 shrink-0">
          <div className="bg-gray-800 rounded-xl p-4 sticky top-24">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Workouts</h3>
              <button onClick={addWorkout} className="p-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg"><Plus size={16} /></button>
            </div>
            {(!form.workouts || form.workouts.length === 0) ? <p className="text-gray-500 text-sm text-center py-4">No workouts yet</p> : (
              <div className="space-y-2">
                {form.workouts.map((w, i) => (
                  <div key={i} onClick={() => setActiveWorkout(i)} className={`p-3 rounded-lg cursor-pointer transition group ${activeWorkout === i ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0"><p className="font-medium truncate">{w.name}</p><p className="text-xs opacity-70">{w.exercises?.length || 0} exercises</p></div>
                      <div className={`flex gap-1 ${activeWorkout === i ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <button onClick={e => { e.stopPropagation(); duplicateWorkout(i); }} className="p-1 hover:bg-white/20 rounded"><Copy size={12} /></button>
                        <button onClick={e => { e.stopPropagation(); deleteWorkout(i); }} className="p-1 hover:bg-red-500/50 rounded"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {!currentWorkout ? (
            <div className="bg-gray-800 rounded-xl p-12 text-center">
              <ClipboardList size={48} className="mx-auto text-gray-600 mb-4" />
              <h3 className="text-lg font-medium mb-2">Add your first workout</h3>
              <p className="text-gray-400 mb-4">Programs contain multiple workouts</p>
              <button onClick={addWorkout} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg inline-flex items-center gap-2"><Plus size={18} /> Add Workout</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-xl p-4">
                <input className="bg-transparent text-lg font-semibold border-none outline-none focus:ring-2 focus:ring-purple-500 rounded px-2 -ml-2 w-full" value={currentWorkout.name} onChange={e => updateWorkout(activeWorkout, { name: e.target.value })} placeholder="Workout Name" />
              </div>

              <div className="bg-gray-800 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Exercises ({currentWorkout.exercises?.length || 0})</h3>
                  <div className="relative" ref={dropdownRef}>
                    <button onClick={() => setShowExerciseDropdown(!showExerciseDropdown)} className="bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1">
                      <Plus size={16} /> Add Exercise <ChevronDown size={14} className={`transition ${showExerciseDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showExerciseDropdown && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-gray-700 rounded-xl shadow-2xl border border-gray-600 z-20 overflow-hidden">
                        <div className="p-3 border-b border-gray-600">
                          <input type="text" placeholder="Search exercises..." className="w-full bg-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" value={exerciseSearch} onChange={e => setExerciseSearch(e.target.value)} autoFocus />
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {categories.map(c => <button key={c} onClick={() => setExerciseFilter(c)} className={`px-2 py-0.5 rounded text-xs ${exerciseFilter === c ? 'bg-purple-600' : 'bg-gray-600 hover:bg-gray-500'}`}>{c}</button>)}
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {filteredExercises.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">No exercises found</p> : (
                            filteredExercises.map(ex => (
                              <button key={ex.id} onClick={() => addExerciseToWorkout(ex)} className="w-full px-3 py-2 text-left hover:bg-gray-600 flex justify-between items-center group">
                                <div><p className="text-sm font-medium">{ex.name}</p><p className="text-xs text-gray-400">{ex.muscles?.join(', ')}</p></div>
                                <Plus size={16} className="text-gray-500 group-hover:text-purple-400" />
                              </button>
                            ))
                          )}
                        </div>
                        <div className="p-2 border-t border-gray-600">
                          <button onClick={() => { setShowExerciseDropdown(false); onCreateExercise(); }} className="w-full text-sm text-purple-400 hover:text-purple-300 py-1">+ Create Custom Exercise</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {(!currentWorkout.exercises || currentWorkout.exercises.length === 0) ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-lg">
                    <Dumbbell size={32} className="mx-auto text-gray-600 mb-2" />
                    <p className="text-gray-400">No exercises yet</p>
                    <p className="text-gray-500 text-sm mt-1">Click "Add Exercise" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentWorkout.exercises.map((ex, i) => (
                      <div key={i} draggable onDragStart={e => handleDragStart(e, i)} onDragOver={e => handleDragOver(e, i)} onDrop={e => handleDrop(e, i)} onDragEnd={handleDragEnd}
                        className={`bg-gray-700 rounded-lg p-4 transition ${draggedExercise === i ? 'opacity-50' : ''} ${dragOverIndex === i ? 'ring-2 ring-purple-500' : ''}`}>
                        <div className="flex gap-3">
                          <div className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 pt-1"><GripVertical size={20} /></div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-3">
                              <div><p className="font-medium">{ex.name}</p><p className="text-xs text-gray-400">{ex.category}</p></div>
                              <button onClick={() => deleteExercise(i)} className="p-1.5 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400"><Trash2 size={16} /></button>
                            </div>
                            {ex.type === 'weight' ? (
                              <div className="grid grid-cols-4 gap-3">
                                <div><label className="text-xs text-gray-400 block mb-1">Sets</label><input type="number" className="w-full bg-gray-600 rounded p-2 text-center" value={ex.sets} onChange={e => updateExercise(i, { sets: +e.target.value })} /></div>
                                <div><label className="text-xs text-gray-400 block mb-1">Reps</label><input type="number" className="w-full bg-gray-600 rounded p-2 text-center" value={ex.reps} onChange={e => updateExercise(i, { reps: +e.target.value })} /></div>
                                <div><label className="text-xs text-gray-400 block mb-1">Weight</label><input type="number" className="w-full bg-gray-600 rounded p-2 text-center" value={ex.weight} onChange={e => updateExercise(i, { weight: +e.target.value })} /></div>
                                <div><label className="text-xs text-gray-400 block mb-1">Rest (s)</label><input type="number" className="w-full bg-gray-600 rounded p-2 text-center" value={ex.rest} onChange={e => updateExercise(i, { rest: +e.target.value })} /></div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs text-gray-400 block mb-1">Duration (min)</label><input type="number" className="w-full bg-gray-600 rounded p-2 text-center" value={ex.duration} onChange={e => updateExercise(i, { duration: +e.target.value })} /></div>
                                {ex.type === 'cardio' && <div><label className="text-xs text-gray-400 block mb-1">Distance (mi)</label><input type="number" className="w-full bg-gray-600 rounded p-2 text-center" value={ex.distance} onChange={e => updateExercise(i, { distance: +e.target.value })} /></div>}
                              </div>
                            )}
                            <input className="w-full bg-gray-600 rounded p-2 mt-3 text-sm" placeholder="Notes (form cues, alternatives...)" value={ex.notes || ''} onChange={e => updateExercise(i, { notes: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ LIVE SESSION ============

function LiveSessionView({ session, setSession, onSave }) {
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const timerRef = useRef(null);
  const ex = session.exercises[session.currentExercise];
  const originalEx = session.workout.exercises[session.currentExercise];

  useEffect(() => {
    if (isResting && restTimer > 0) timerRef.current = setTimeout(() => setRestTimer(r => r - 1), 1000);
    else if (restTimer === 0 && isResting) setIsResting(false);
    return () => clearTimeout(timerRef.current);
  }, [restTimer, isResting]);

  const startRest = (s) => { setRestTimer(s); setIsResting(true); };
  const stopRest = () => { setRestTimer(0); setIsResting(false); };

  const addSet = () => {
    const newSet = ex.type === 'weight' ? { reps: originalEx.reps, weight: ex.actualSets.length > 0 ? ex.actualSets[ex.actualSets.length - 1].weight : originalEx.weight } : { duration: originalEx.duration, distance: originalEx.distance || 0 };
    updateExercise('actualSets', [...ex.actualSets, newSet]);
  };
  const updateSet = (idx, key, val) => updateExercise('actualSets', ex.actualSets.map((s, i) => i === idx ? { ...s, [key]: val } : s));
  const removeSet = (idx) => updateExercise('actualSets', ex.actualSets.filter((_, i) => i !== idx));
  const updateExercise = (key, val) => setSession(s => ({ ...s, exercises: s.exercises.map((e, i) => i === s.currentExercise ? { ...e, [key]: val } : e) }));

  const nextExercise = () => { if (session.currentExercise < session.exercises.length - 1) { setSession(s => ({ ...s, currentExercise: s.currentExercise + 1 })); setIsResting(false); setRestTimer(0); } };
  const prevExercise = () => { if (session.currentExercise > 0) { setSession(s => ({ ...s, currentExercise: s.currentExercise - 1 })); setIsResting(false); setRestTimer(0); } };

  const finishSession = () => {
    const exerciseData = {};
    session.exercises.forEach((ex, i) => {
      if (ex.actualSets.length > 0 || ex.notes) {
        const totals = ex.type === 'weight' ? { sets: ex.actualSets.length, reps: ex.actualSets[0]?.reps || 0, weight: Math.max(...ex.actualSets.map(s => s.weight || 0), 0) } : { duration: ex.actualSets.reduce((sum, s) => sum + (s.duration || 0), 0), distance: ex.actualSets.reduce((sum, s) => sum + (s.distance || 0), 0) };
        exerciseData[i] = { ...totals, notes: ex.notes, setDetails: ex.actualSets };
      }
    });
    onSave({ assignmentId: session.assignmentId, workoutIdx: session.workoutIdx, exercises: exerciseData, sessionNotes: session.sessionNotes, duration: Math.round((Date.now() - session.startTime) / 60000), date: new Date().toISOString() });
  };

  const elapsed = Math.floor((Date.now() - session.startTime) / 60000);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gradient-to-r from-green-700 to-teal-700 p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div><p className="text-sm opacity-80">Live Session</p><h1 className="text-xl font-bold">{session.clientName}</h1></div>
          <div className="text-right"><p className="text-2xl font-mono">{elapsed}m</p><p className="text-xs opacity-80">{session.workout.name}</p></div>
        </div>
      </header>
      {session.clientHealth && <div className="bg-yellow-900/50 border-b border-yellow-700 p-3 flex gap-2"><AlertTriangle className="text-yellow-500 shrink-0" size={18} /><p className="text-sm">{session.clientHealth}</p></div>}

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevExercise} disabled={session.currentExercise === 0} className="p-2 bg-gray-700 rounded disabled:opacity-30"><ChevronLeft size={20} /></button>
          <div className="text-center">
            <p className="text-sm text-gray-400">Exercise {session.currentExercise + 1} of {session.exercises.length}</p>
            <h2 className="text-xl font-bold">{ex.name}</h2>
            <p className="text-sm text-gray-400">Target: {originalEx.sets} sets × {originalEx.reps} reps @ {originalEx.weight} lbs</p>
          </div>
          <button onClick={nextExercise} disabled={session.currentExercise === session.exercises.length - 1} className="p-2 bg-gray-700 rounded disabled:opacity-30"><ChevronRight size={20} /></button>
        </div>

        {isResting && (
          <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-4 mb-4 text-center">
            <p className="text-sm text-blue-400 mb-1">Rest Timer</p>
            <p className="text-4xl font-mono font-bold">{Math.floor(restTimer / 60)}:{String(restTimer % 60).padStart(2, '0')}</p>
            <button onClick={stopRest} className="mt-2 px-4 py-1 bg-blue-700 rounded text-sm">Skip</button>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Sets Completed</h3>
            <button onClick={addSet} className="bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded text-sm flex items-center gap-1"><Plus size={16} /> Add Set</button>
          </div>
          {ex.actualSets.length === 0 ? <p className="text-gray-500 text-center py-4">Tap "Add Set" after each set</p> : (
            <div className="space-y-2">
              {ex.actualSets.map((set, i) => (
                <div key={i} className="bg-gray-700 rounded p-3 flex items-center gap-3">
                  <span className="text-sm text-gray-400 w-8">#{i + 1}</span>
                  {ex.type === 'weight' ? (
                    <>
                      <div className="flex-1"><label className="text-xs text-gray-400">Reps</label><input type="number" className="w-full bg-gray-600 rounded p-2 text-lg" value={set.reps} onChange={e => updateSet(i, 'reps', +e.target.value)} /></div>
                      <div className="flex-1"><label className="text-xs text-gray-400">Weight</label><input type="number" className="w-full bg-gray-600 rounded p-2 text-lg" value={set.weight} onChange={e => updateSet(i, 'weight', +e.target.value)} /></div>
                    </>
                  ) : (
                    <div className="flex-1"><label className="text-xs text-gray-400">Duration</label><input type="number" className="w-full bg-gray-600 rounded p-2 text-lg" value={set.duration} onChange={e => updateSet(i, 'duration', +e.target.value)} /></div>
                  )}
                  <button onClick={() => removeSet(i)} className="p-2 text-red-400 hover:bg-red-900/50 rounded"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          )}
          {ex.actualSets.length > 0 && ex.type === 'weight' && (
            <div className="flex gap-2 mt-3">
              {[60, 90, 120, 180].map(s => <button key={s} onClick={() => startRest(s)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded text-sm flex items-center justify-center gap-1"><Clock size={14} /> {s >= 60 ? `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` : `${s}s`}</button>)}
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <label className="text-sm text-gray-400 flex items-center gap-1 mb-2"><MessageSquare size={14} /> Exercise Notes</label>
          <textarea className="w-full bg-gray-700 rounded p-2 text-sm" rows={2} placeholder="Form cues, modifications..." value={ex.notes} onChange={e => updateExercise('notes', e.target.value)} />
        </div>

        <div className="flex gap-2 mb-4">{session.exercises.map((e, i) => <button key={i} onClick={() => setSession(s => ({ ...s, currentExercise: i }))} className={`flex-1 h-2 rounded ${i === session.currentExercise ? 'bg-green-500' : e.actualSets.length > 0 ? 'bg-green-700' : 'bg-gray-700'}`} />)}</div>

        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <label className="text-sm text-gray-400 flex items-center gap-1 mb-2"><MessageSquare size={14} /> Session Notes</label>
          <textarea className="w-full bg-gray-700 rounded p-2 text-sm" rows={3} placeholder="Overall session notes..." value={session.sessionNotes} onChange={e => setSession(s => ({ ...s, sessionNotes: e.target.value }))} />
        </div>

        <div className="flex gap-3">
          <button onClick={() => setSession(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded font-medium">Cancel</button>
          <button onClick={finishSession} className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded font-medium flex items-center justify-center gap-2"><Check size={18} /> Finish</button>
        </div>
      </div>
    </div>
  );
}

// ============ CLIENTS ============

function ClientsTab({ data, selected, setSelected, onAdd, onEdit, onDelete, onAssign, onStartSession, onEditAssignment, onDeleteAssignment, onAddMeasurement, onDeleteMeasurement }) {
  const client = data.clients.find(c => c.id === selected);
  const clientAssignments = data.assignments.filter(a => a.clientId === selected);
  const [clientTab, setClientTab] = useState('overview');
  const [selectWorkout, setSelectWorkout] = useState(null);

  if (client) {
    const clientLogs = data.logs.filter(l => clientAssignments.some(a => a.id === l.assignmentId)).sort((a, b) => new Date(b.date) - new Date(a.date));
    const clientMeasurements = data.measurements.filter(m => m.clientId === client.id).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (selectWorkout) {
      return (
        <div>
          <button onClick={() => setSelectWorkout(null)} className="text-purple-400 mb-4 flex items-center gap-1">← Back</button>
          <h2 className="text-xl font-bold mb-4">Start Session: {selectWorkout.name}</h2>
          <div className="space-y-2">
            {selectWorkout.workouts?.map((w, i) => (
              <button key={i} onClick={() => { onStartSession(client, selectWorkout, i); setSelectWorkout(null); }} className="w-full bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-left flex justify-between items-center">
                <div><p className="font-medium">{w.name}</p><p className="text-sm text-gray-400">{w.exercises?.length || 0} exercises</p></div>
                <Play className="text-green-500" size={24} />
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div>
        <button onClick={() => setSelected(null)} className="text-purple-400 mb-4 flex items-center gap-1">← All Clients</button>
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-start mb-3">
            <div><h2 className="text-xl font-bold">{client.name}</h2><p className="text-gray-400 text-sm">{client.email}{client.phone && ` · ${client.phone}`}</p></div>
            <div className="flex gap-2">
              <button onClick={() => onEdit(client)} className="p-2 bg-gray-700 rounded hover:bg-gray-600"><Edit2 size={16} /></button>
              <button onClick={() => onDelete(client.id)} className="p-2 bg-red-900/50 rounded hover:bg-red-800"><Trash2 size={16} /></button>
            </div>
          </div>
          {client.healthConditions && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3 mb-3 flex gap-2">
              <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
              <div><p className="font-medium text-yellow-400 text-sm">Health Conditions</p><p className="text-sm">{client.healthConditions}</p></div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-400">Goals:</span> {client.goals || 'Not set'}</div>
            <div><span className="text-gray-400">Status:</span> <span className={client.active ? 'text-green-400' : 'text-gray-500'}>{client.active ? 'Active' : 'Inactive'}</span></div>
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto">
          {['overview', 'programs', 'history', 'measurements', 'calendar'].map(t => (
            <button key={t} onClick={() => setClientTab(t)} className={`px-3 py-1.5 rounded text-sm capitalize whitespace-nowrap ${clientTab === t ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>{t}</button>
          ))}
        </div>

        {clientTab === 'overview' && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-800 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-purple-400">{clientAssignments.length}</p><p className="text-xs text-gray-400">Programs</p></div>
              <div className="bg-gray-800 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-green-400">{clientLogs.length}</p><p className="text-xs text-gray-400">Sessions</p></div>
              <div className="bg-gray-800 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-blue-400">{Math.round((new Date() - new Date(client.createdAt)) / 86400000)}</p><p className="text-xs text-gray-400">Days</p></div>
            </div>
            {clientAssignments.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2"><Play size={16} className="text-green-500" /> Start Session</h3>
                <div className="grid grid-cols-2 gap-2">
                  {clientAssignments.map(a => <button key={a.id} onClick={() => setSelectWorkout(a)} className="bg-green-700 hover:bg-green-600 rounded-lg p-3 text-left"><p className="font-medium">{a.name.split(' - ')[0]}</p><p className="text-xs opacity-80">{a.workouts?.length} workouts</p></button>)}
                </div>
              </div>
            )}
          </>
        )}

        {clientTab === 'programs' && (
          <>
            <div className="flex justify-between items-center mb-3"><h3 className="font-semibold">Assigned Programs</h3><button onClick={() => onAssign(client)} className="bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded text-sm flex items-center gap-1"><Plus size={16} /> Assign</button></div>
            {clientAssignments.length === 0 ? <p className="text-gray-500 text-center py-8">No programs assigned</p> : (
              <div className="space-y-2">
                {clientAssignments.map(a => (
                  <div key={a.id} className="bg-gray-800 rounded-lg p-3 flex justify-between items-center">
                    <div><p className="font-medium">{a.name}</p><p className="text-sm text-gray-400">{a.workouts?.length || 0} workouts</p></div>
                    <div className="flex gap-2">
                      <button onClick={() => setSelectWorkout(a)} className="px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded text-sm flex items-center gap-1"><Play size={14} /> Start</button>
                      <button onClick={() => onEditAssignment(a)} className="p-2 bg-gray-700 rounded hover:bg-gray-600"><Edit2 size={14} /></button>
                      <button onClick={() => onDeleteAssignment(a.id)} className="p-2 bg-red-900/50 rounded hover:bg-red-800"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {clientTab === 'history' && <SessionHistory logs={clientLogs} assignments={clientAssignments} />}
        {clientTab === 'measurements' && <MeasurementsView measurements={clientMeasurements} onAdd={() => onAddMeasurement(client)} onDelete={onDeleteMeasurement} />}
        {clientTab === 'calendar' && <WorkoutCalendar logs={clientLogs} />}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-semibold">{data.clients.length} Clients</h2><button onClick={onAdd} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded flex items-center gap-2"><Plus size={18} /> Add Client</button></div>
      {data.clients.length === 0 ? <p className="text-gray-500 text-center py-12">No clients yet</p> : (
        <div className="space-y-2">
          {data.clients.map(c => {
            const cnt = data.assignments.filter(a => a.clientId === c.id).length;
            return (
              <div key={c.id} onClick={() => { setSelected(c.id); setClientTab('overview'); }} className="bg-gray-800 rounded-lg p-4 flex justify-between items-center cursor-pointer hover:border-purple-500/50 border border-transparent transition">
                <div><p className="font-medium">{c.name}</p><p className="text-sm text-gray-400">{c.goals || 'No goals'} · {cnt} program{cnt !== 1 ? 's' : ''}</p></div>
                <div className="flex items-center gap-3">
                  {c.healthConditions && <AlertTriangle className="text-yellow-500" size={18} />}
                  <span className={`text-xs px-2 py-1 rounded ${c.active ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-400'}`}>{c.active ? 'Active' : 'Inactive'}</span>
                  <ChevronRight className="text-gray-500" size={18} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SessionHistory({ logs, assignments }) {
  if (logs.length === 0) return <p className="text-gray-500 text-center py-8">No sessions logged</p>;
  return (
    <div className="space-y-3">
      {logs.map(log => {
        const a = assignments.find(x => x.id === log.assignmentId);
        const w = a?.workouts?.[log.workoutIdx];
        return (
          <div key={log.id} className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2"><div><p className="font-medium">{w?.name || 'Workout'}</p><p className="text-sm text-gray-400">{new Date(log.date).toLocaleDateString()} · {log.duration || '?'}min</p></div></div>
            {log.exercises && Object.entries(log.exercises).map(([idx, ex]) => {
              const orig = w?.exercises?.[parseInt(idx)];
              return (
                <div key={idx} className="text-sm border-t border-gray-700 pt-2 mt-2">
                  <p className="text-gray-300">{orig?.name || `Exercise ${+idx + 1}`}</p>
                  {ex.setDetails ? <p className="text-gray-500">{ex.setDetails.length} sets: {ex.setDetails.map(s => s.weight ? `${s.reps}×${s.weight}lb` : `${s.duration}min`).join(', ')}</p> : <p className="text-gray-500">{ex.sets}×{ex.reps} @ {ex.weight}lb</p>}
                  {ex.notes && <p className="text-yellow-400/80 text-xs mt-1">📝 {ex.notes}</p>}
                </div>
              );
            })}
            {log.sessionNotes && <div className="border-t border-gray-700 pt-2 mt-2"><p className="text-sm text-purple-400">Notes: {log.sessionNotes}</p></div>}
          </div>
        );
      })}
    </div>
  );
}

function MeasurementsView({ measurements, onAdd, onDelete }) {
  const fields = [{ key: 'weight', label: 'Weight', unit: 'lbs' }, { key: 'bodyFat', label: 'Body Fat', unit: '%' }, { key: 'chest', label: 'Chest', unit: '"' }, { key: 'waist', label: 'Waist', unit: '"' }, { key: 'hips', label: 'Hips', unit: '"' }, { key: 'arms', label: 'Arms', unit: '"' }, { key: 'thighs', label: 'Thighs', unit: '"' }];
  const getProgress = (f) => { const v = measurements.filter(m => m[f.key]); if (v.length < 2) return null; return { first: v[v.length - 1][f.key], last: v[0][f.key], change: v[0][f.key] - v[v.length - 1][f.key] }; };
  return (
    <div>
      <div className="flex justify-between items-center mb-3"><h3 className="font-semibold flex items-center gap-2"><Ruler size={18} /> Measurements</h3><button onClick={onAdd} className="bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded text-sm flex items-center gap-1"><Plus size={16} /> Record</button></div>
      {measurements.length === 0 ? <p className="text-gray-500 text-center py-8">No measurements</p> : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {fields.map(f => { const p = getProgress(f); if (!p) return null; return <div key={f.key} className="bg-gray-800 rounded-lg p-3"><p className="text-xs text-gray-400 mb-1">{f.label}</p><p className="text-lg font-bold">{p.last}{f.unit}</p><p className={`text-xs ${p.change < 0 ? 'text-green-400' : p.change > 0 ? 'text-red-400' : 'text-gray-400'}`}>{p.change > 0 ? '+' : ''}{p.change.toFixed(1)}{f.unit}</p></div>; })}
          </div>
          <div className="space-y-2">{measurements.map(m => <div key={m.id} className="bg-gray-800 rounded-lg p-3 flex justify-between items-start"><div><p className="font-medium">{new Date(m.date).toLocaleDateString()}</p><div className="flex flex-wrap gap-x-4 text-sm text-gray-400 mt-1">{m.weight && <span>Weight: {m.weight}lbs</span>}{m.bodyFat && <span>BF: {m.bodyFat}%</span>}{m.chest && <span>Chest: {m.chest}"</span>}{m.waist && <span>Waist: {m.waist}"</span>}{m.hips && <span>Hips: {m.hips}"</span>}{m.arms && <span>Arms: {m.arms}"</span>}{m.thighs && <span>Thighs: {m.thighs}"</span>}</div></div><button onClick={() => onDelete(m.id)} className="p-1.5 bg-red-900/50 rounded hover:bg-red-800"><Trash2 size={14} /></button></div>)}</div>
        </>
      )}
    </div>
  );
}

function WorkoutCalendar({ logs }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear(), month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const getLogsForDay = (day) => { if (!day) return []; const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; return logs.filter(l => l.date.startsWith(d)); };
  const today = new Date(), isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 bg-gray-700 rounded hover:bg-gray-600"><ChevronLeft size={18} /></button>
        <h3 className="font-semibold">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 bg-gray-700 rounded hover:bg-gray-600"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">{['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className="text-center text-xs text-gray-500 py-1">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">{days.map((day, i) => { const dl = getLogsForDay(day); return <div key={i} className={`aspect-square rounded-lg p-1 ${day ? 'bg-gray-800' : ''} ${isToday(day) ? 'ring-2 ring-purple-500' : ''}`}>{day && <><p className={`text-xs ${isToday(day) ? 'text-purple-400 font-bold' : 'text-gray-400'}`}>{day}</p>{dl.length > 0 && <div className="mt-1 w-2 h-2 bg-green-500 rounded-full mx-auto" />}</>}</div>; })}</div>
      <p className="text-sm text-gray-400 mt-4 text-center">{logs.filter(l => new Date(l.date).getMonth() === month && new Date(l.date).getFullYear() === year).length} sessions this month</p>
    </div>
  );
}

// ============ REPORTS ============

function ReportsTab({ data }) {
  const [sel, setSel] = useState(null);
  const client = data.clients.find(c => c.id === sel);
  if (client) {
    const ca = data.assignments.filter(a => a.clientId === client.id), cl = data.logs.filter(l => ca.some(a => a.id === l.assignmentId)).sort((a, b) => new Date(b.date) - new Date(a.date)), cm = data.measurements.filter(m => m.clientId === client.id);
    const ep = {}; cl.forEach(log => { const a = ca.find(x => x.id === log.assignmentId), w = a?.workouts?.[log.workoutIdx]; if (w && log.exercises) Object.entries(log.exercises).forEach(([idx, p]) => { const ex = w.exercises?.[parseInt(idx)]; if (ex?.type === 'weight' && p.weight) { if (!ep[ex.name]) ep[ex.name] = []; ep[ex.name].push({ date: log.date, weight: p.weight }); } }); });
    return (
      <div>
        <button onClick={() => setSel(null)} className="text-purple-400 mb-4 flex items-center gap-1">← All</button>
        <h2 className="text-xl font-bold mb-4">{client.name}'s Progress</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-800 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-purple-400">{cl.length}</p><p className="text-xs text-gray-400">Sessions</p></div>
          <div className="bg-gray-800 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-green-400">{cl.reduce((s, l) => s + (l.duration || 0), 0)}</p><p className="text-xs text-gray-400">Total Mins</p></div>
          <div className="bg-gray-800 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-blue-400">{cm.length}</p><p className="text-xs text-gray-400">Measurements</p></div>
          <div className="bg-gray-800 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-yellow-400">{cl.filter(l => new Date(l.date) > Date.now() - 604800000).length}</p><p className="text-xs text-gray-400">This Week</p></div>
        </div>
        {Object.keys(ep).length > 0 && <div className="mb-6"><h3 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp size={18} /> Strength Progress</h3><div className="space-y-3">{Object.entries(ep).slice(0, 6).map(([n, r]) => { const f = r[r.length - 1], l = r[0], c = l.weight - f.weight; return <div key={n} className="bg-gray-800 rounded-lg p-3"><div className="flex justify-between items-center mb-1"><p className="font-medium">{n}</p><span className={`text-sm ${c > 0 ? 'text-green-400' : c < 0 ? 'text-red-400' : 'text-gray-400'}`}>{c > 0 ? '+' : ''}{c} lbs</span></div><p className="text-sm text-gray-400">{f.weight} → {l.weight} lbs ({r.length} sessions)</p></div>; })}</div></div>}
      </div>
    );
  }
  const cs = data.clients.map(c => { const a = data.assignments.filter(x => x.clientId === c.id), l = data.logs.filter(x => a.some(y => y.id === x.assignmentId)), r = l.filter(x => new Date(x.date) > Date.now() - 604800000); return { ...c, totalLogs: l.length, recentLogs: r.length }; });
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Reports</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-800 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-purple-400">{data.clients.filter(c => c.active).length}</p><p className="text-xs text-gray-400">Active</p></div>
        <div className="bg-gray-800 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-green-400">{data.logs.length}</p><p className="text-xs text-gray-400">Sessions</p></div>
        <div className="bg-gray-800 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-blue-400">{data.logs.reduce((s, l) => s + (l.duration || 0), 0)}</p><p className="text-xs text-gray-400">Total Mins</p></div>
        <div className="bg-gray-800 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-yellow-400">{data.logs.filter(l => new Date(l.date) > Date.now() - 604800000).length}</p><p className="text-xs text-gray-400">This Week</p></div>
      </div>
      {data.clients.length === 0 ? <p className="text-gray-500 text-center py-12">Add clients to see reports</p> : <div className="space-y-2">{cs.sort((a, b) => b.recentLogs - a.recentLogs).map(c => <div key={c.id} onClick={() => setSel(c.id)} className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:border-purple-500/50 border border-transparent transition flex justify-between items-center"><div><p className="font-medium">{c.name}</p><p className="text-sm text-gray-400">{c.totalLogs} sessions · {c.recentLogs} this week</p></div><div className="flex items-center gap-3"><div className={`w-3 h-3 rounded-full ${c.recentLogs >= 3 ? 'bg-green-500' : c.recentLogs > 0 ? 'bg-yellow-500' : 'bg-red-500'}`} /><ChevronRight className="text-gray-500" size={18} /></div></div>)}</div>}
    </div>
  );
}

// ============ MODALS ============

function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"><div className="bg-gray-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center p-4 border-b border-gray-700"><h3 className="font-semibold text-lg">{title}</h3><button onClick={onClose} className="p-1 hover:bg-gray-700 rounded"><X size={20} /></button></div><div className="p-4">{children}</div></div></div>;
}

function ClientModal({ client, onSave, onClose }) {
  const [form, setForm] = useState(client || { name: '', email: '', phone: '', goals: '', healthConditions: '', notes: '', active: true });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return <Modal title={client ? 'Edit Client' : 'Add Client'} onClose={onClose}><div className="space-y-4"><input className="w-full bg-gray-700 rounded p-2" placeholder="Name *" value={form.name} onChange={e => set('name', e.target.value)} /><input className="w-full bg-gray-700 rounded p-2" placeholder="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} /><input className="w-full bg-gray-700 rounded p-2" placeholder="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} /><input className="w-full bg-gray-700 rounded p-2" placeholder="Goals" value={form.goals} onChange={e => set('goals', e.target.value)} /><div><label className="text-sm text-yellow-400 flex items-center gap-1 mb-1"><AlertTriangle size={14} /> Health Conditions</label><textarea className="w-full bg-gray-700 rounded p-2" rows={2} placeholder="Injuries, conditions..." value={form.healthConditions} onChange={e => set('healthConditions', e.target.value)} /></div><textarea className="w-full bg-gray-700 rounded p-2" rows={2} placeholder="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} /><label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} /> Active</label><button onClick={() => form.name && onSave(form)} disabled={!form.name} className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 py-2 rounded font-medium">{client ? 'Save' : 'Add'}</button></div></Modal>;
}

function AssignModal({ clientId, programs, clients, onSave, onClose }) {
  const [sel, setSel] = useState(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const client = clients.find(c => c.id === clientId);
  if (sel) return <Modal title="Assign Program" onClose={onClose}>{client?.healthConditions && <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3 mb-4 flex gap-2"><AlertTriangle className="text-yellow-500 shrink-0" size={20} /><div><p className="font-medium text-yellow-400 text-sm">{client.name}'s Conditions</p><p className="text-sm">{client.healthConditions}</p></div></div>}<div className="space-y-4"><p>Assigning <strong>{sel.name}</strong> to <strong>{client?.name}</strong></p><div><label className="text-sm text-gray-400">Start Date</label><input type="date" className="w-full bg-gray-700 rounded p-2" value={startDate} onChange={e => setStartDate(e.target.value)} /></div><button onClick={() => onSave({ clientId, programId: sel.id, name: `${sel.name} - ${client?.name}`, startDate, workouts: JSON.parse(JSON.stringify(sel.workouts)) })} className="w-full bg-purple-600 hover:bg-purple-500 py-2 rounded font-medium">Assign</button></div></Modal>;
  return <Modal title="Select Program" onClose={onClose}>{programs.length === 0 ? <p className="text-gray-500 text-center py-8">No programs</p> : <div className="space-y-2">{programs.map(p => <button key={p.id} onClick={() => setSel(p)} className="w-full bg-gray-700 hover:bg-gray-600 rounded p-3 text-left"><p className="font-medium">{p.name}</p><p className="text-sm text-gray-400">{p.workouts?.length || 0} workouts</p></button>)}</div>}</Modal>;
}

function AssignFromProgramModal({ program, clients, onSave, onClose }) {
  const [sel, setSel] = useState(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const client = clients.find(c => c.id === sel);
  if (client) return <Modal title="Assign Program" onClose={onClose}>{client.healthConditions && <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3 mb-4 flex gap-2"><AlertTriangle className="text-yellow-500 shrink-0" size={20} /><div><p className="font-medium text-yellow-400 text-sm">{client.name}'s Conditions</p><p className="text-sm">{client.healthConditions}</p></div></div>}<div className="space-y-4"><p>Assigning <strong>{program.name}</strong> to <strong>{client.name}</strong></p><div><label className="text-sm text-gray-400">Start Date</label><input type="date" className="w-full bg-gray-700 rounded p-2" value={startDate} onChange={e => setStartDate(e.target.value)} /></div><button onClick={() => onSave({ clientId: client.id, programId: program.id, name: `${program.name} - ${client.name}`, startDate, workouts: JSON.parse(JSON.stringify(program.workouts)) })} className="w-full bg-purple-600 hover:bg-purple-500 py-2 rounded font-medium">Assign</button></div></Modal>;
  return <Modal title="Select Client" onClose={onClose}>{clients.length === 0 ? <p className="text-gray-500 text-center py-8">No clients</p> : <div className="space-y-2">{clients.filter(c => c.active).map(c => <button key={c.id} onClick={() => setSel(c.id)} className="w-full bg-gray-700 hover:bg-gray-600 rounded p-3 text-left flex justify-between items-center"><p className="font-medium">{c.name}</p>{c.healthConditions && <AlertTriangle className="text-yellow-500" size={18} />}</button>)}</div>}</Modal>;
}

function EditAssignmentModal({ assignment, onSave, onClose }) {
  const [form, setForm] = useState(assignment);
  return <Modal title="Edit Assignment" onClose={onClose}><div className="space-y-4"><input className="w-full bg-gray-700 rounded p-2" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /><p className="text-sm text-gray-400">{form.workouts?.length} workouts</p><button onClick={() => onSave(form)} className="w-full bg-purple-600 hover:bg-purple-500 py-2 rounded font-medium">Save</button></div></Modal>;
}

function MeasurementModal({ clientId, onSave, onClose }) {
  const [form, setForm] = useState({ clientId, date: new Date().toISOString().split('T')[0], weight: '', bodyFat: '', chest: '', waist: '', hips: '', arms: '', thighs: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return <Modal title="Record Measurements" onClose={onClose}><div className="space-y-4"><div><label className="text-sm text-gray-400">Date</label><input type="date" className="w-full bg-gray-700 rounded p-2" value={form.date} onChange={e => set('date', e.target.value)} /></div><div className="grid grid-cols-2 gap-3"><div><label className="text-sm text-gray-400">Weight (lbs)</label><input type="number" className="w-full bg-gray-700 rounded p-2" value={form.weight} onChange={e => set('weight', e.target.value ? +e.target.value : '')} /></div><div><label className="text-sm text-gray-400">Body Fat %</label><input type="number" className="w-full bg-gray-700 rounded p-2" value={form.bodyFat} onChange={e => set('bodyFat', e.target.value ? +e.target.value : '')} /></div><div><label className="text-sm text-gray-400">Chest (in)</label><input type="number" className="w-full bg-gray-700 rounded p-2" value={form.chest} onChange={e => set('chest', e.target.value ? +e.target.value : '')} /></div><div><label className="text-sm text-gray-400">Waist (in)</label><input type="number" className="w-full bg-gray-700 rounded p-2" value={form.waist} onChange={e => set('waist', e.target.value ? +e.target.value : '')} /></div><div><label className="text-sm text-gray-400">Hips (in)</label><input type="number" className="w-full bg-gray-700 rounded p-2" value={form.hips} onChange={e => set('hips', e.target.value ? +e.target.value : '')} /></div><div><label className="text-sm text-gray-400">Arms (in)</label><input type="number" className="w-full bg-gray-700 rounded p-2" value={form.arms} onChange={e => set('arms', e.target.value ? +e.target.value : '')} /></div><div><label className="text-sm text-gray-400">Thighs (in)</label><input type="number" className="w-full bg-gray-700 rounded p-2" value={form.thighs} onChange={e => set('thighs', e.target.value ? +e.target.value : '')} /></div></div><button onClick={() => onSave(form)} className="w-full bg-purple-600 hover:bg-purple-500 py-2 rounded font-medium">Save</button></div></Modal>;
}
