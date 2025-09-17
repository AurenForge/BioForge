
(function(){
  const { useState, useEffect, useMemo } = React;
  // Framer Motion fallback (if CDN fails to load)
  const motion = (window.framerMotion && window.framerMotion.motion) || {
    div: (props) => React.createElement("div", props),
  };

  function useLocal(key, init){
    const [val, setVal] = useState(()=>{
      try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : init; } catch(e){ return init; }
    });
    useEffect(()=>{ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} },[key,val]);
    return [val, setVal];
  }

  const DEFAULT_EXERCISES = [
    { name: "Push-up", type: "calisthenics", unilateral: false },
    { name: "Pull-up", type: "calisthenics", unilateral: false },
    { name: "Bodyweight Squat", type: "calisthenics", unilateral: false },
    { name: "Lunge", type: "calisthenics", unilateral: true },
    { name: "Plank", type: "calisthenics", unilateral: false },
    { name: "Bench Press", type: "weights", unilateral: false },
    { name: "Overhead Press", type: "weights", unilateral: false },
    { name: "Barbell Row", type: "weights", unilateral: false },
    { name: "Romanian Deadlift", type: "weights", unilateral: false },
    { name: "Back Squat", type: "weights", unilateral: false },
    { name: "Hamstring Curl", type: "weights", unilateral: false },
    { name: "Hip Thrust", type: "weights", unilateral: false },
    { name: "Calf Raise", type: "weights", unilateral: false },
    { name: "Zone 2 Run", type: "cardio", unilateral: false },
    { name: "Sprints", type: "cardio", unilateral: false },
  ];

  const TWO_WEEK_TEMPLATE = [
    { week: 1, day: "Monday", focus: "Upper Strength (Gym)", items: ["Bench Press","Pull-up","Overhead Press","Lateral Raises","Face Pulls"], notes: "Moderate load, perfect form" },
    { week: 1, day: "Tuesday", focus: "Lower Strength + Hamstrings (Gym)", items: ["Romanian Deadlift","Bulgarian Split Squat","Hamstring Curl","Calf Raise"], notes: "Posterior-chain focus" },
    { week: 1, day: "Wednesday", focus: "Zone 2 Run", items: ["Zone 2 Run"], notes: "25–35 min conversational pace" },
    { week: 1, day: "Thursday", focus: "Upper/Push (Gym)", items: ["Incline Press","Weighted Push-up/Dip","Barbell Row","Triceps","Rear Delts"], notes: "Push volume w/o failure" },
    { week: 1, day: "Friday", focus: "Lower/Glutes (Gym)", items: ["Back Squat","Hip Thrust","Lunge","Calf Raise"], notes: "Moderate intensity" },
    { week: 1, day: "Saturday", focus: "Calisthenics + Core (Home)", items: ["Pull-up","Push-up","Bodyweight Squat","Plank"], notes: "3–4 easy rounds" },
    { week: 1, day: "Sunday", focus: "Zone 2 Run", items: ["Zone 2 Run"], notes: "20–30 min easy" },
    { week: 2, day: "Monday", focus: "Upper Strength (Gym)", items: ["Bench Press","Pull-up","Overhead Press","Lateral Raises","Face Pulls"], notes: "As week 1" },
    { week: 2, day: "Tuesday", focus: "Lower Strength (Gym)", items: ["Back Squat","Romanian Deadlift","Lunge","Calf Raise"], notes: "Balanced legs" },
    { week: 2, day: "Wednesday", focus: "Sprints (Optional)", items: ["Sprints"], notes: "6×15–20s, full recovery. Do only EOW." },
    { week: 2, day: "Thursday", focus: "Upper/Push (Gym)", items: ["Incline Press","Weighted Push-up/Dip","Barbell Row","Triceps","Rear Delts"], notes: "Quality over fatigue" },
    { week: 2, day: "Friday", focus: "Posterior + Accessories (Gym)", items: ["Romanian Deadlift","Hip Thrust","Barbell Row","Face Pulls","Core"], notes: "Hamstrings/glutes" },
    { week: 2, day: "Saturday", focus: "Calisthenics + Core (Home)", items: ["Pull-up","Push-up","Bodyweight Squat","Plank"], notes: "Recovery circuit" },
    { week: 2, day: "Sunday", focus: "Zone 2 Run", items: ["Zone 2 Run"], notes: "25–35 min easy" },
  ];

  function todayISO(){ return new Date().toISOString().slice(0,10); }
  function fmt(d){ return new Date(d).toLocaleDateString(); }
  function uid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }

  const FOOD_DICT = {
    "egg": { cals: 70, p: 6, c: 0.5, f: 5 },
    "chicken breast 100g": { cals: 165, p: 31, c: 0, f: 3.6 },
    "greek yogurt 170g": { cals: 100, p: 17, c: 6, f: 0 },
    "olive oil tbsp": { cals: 119, p: 0, c: 0, f: 13.5 },
    "banana": { cals: 105, p: 1.3, c: 27, f: 0.4 },
    "rice cooked cup": { cals: 205, p: 4.3, c: 45, f: 0.4 },
    "almonds 28g": { cals: 164, p: 6, c: 6, f: 14 }
  };

  function App(){
    const [tab, setTab] = useState("today");
    const [library, setLibrary] = useLocal("lib:v1", DEFAULT_EXERCISES);
    const [logs, setLogs] = useLocal("logs:v1", []);
    const [plan, setPlan] = useLocal("plan:v1", TWO_WEEK_TEMPLATE);
    const [food, setFood] = useLocal("food:v1", {});
    const [settings, setSettings] = useLocal("settings:v1", { aiEndpoint:"", aiKey:"", allowOpenFoodFacts:true });
    const [date, setDate] = useState(todayISO());

    useEffect(()=>{
      window.AppAPI = { setTab, exportCSV, exportJSON, importJSON };
    },[]);

    const dayLogs = useMemo(()=> logs.filter(l => l.dateISO === date), [logs, date]);
    const totals = useMemo(()=>{
      const byEx = {};
      for (const l of dayLogs){
        byEx[l.exercise] = byEx[l.exercise] || { sets:0, reps:0, volume:0 };
        byEx[l.exercise].sets += 1;
        byEx[l.exercise].reps += Number(l.reps || 0);
        byEx[l.exercise].volume += (Number(l.load||0)||0) * (Number(l.reps||0)||0);
      }
      return byEx;
    },[dayLogs]);

    const planForDay = useMemo(()=>{
      const d = new Date(date);
      const onejan = new Date(d.getFullYear(),0,1);
      const wk = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
      const week = (wk % 2) === 0 ? 2 : 1;
      const dayName = d.toLocaleDateString(undefined,{ weekday:"long" });
      return plan.find(p => p.week === week && p.day === dayName);
    },[date, plan]);

    const coachNotes = useMemo(()=>{
      const last7 = logs.filter(e => (Date.now() - new Date(e.dateISO).getTime())/86400000 <= 7);
      const totalSets = last7.length;
      const pushSets = last7.filter(e => /press|push-up|dip/i.test(e.exercise)).length;
      const pullSets = last7.filter(e => /row|pull-up/i.test(e.exercise)).length;
      const legSets = last7.filter(e => /squat|deadlift|rdl|lunge|hip thrust|calf/i.test(e.exercise)).length;
      const tips = [];
      if (totalSets < 25) tips.push("Overall volume is low. Consider +2–3 mini-sets per day.");
      if (pushSets > pullSets + 4) tips.push("Push > Pull. Add 2–3 rowing sets for balance.");
      if (legSets < 8) tips.push("Leg work is light. Add 1–2 sets of RDL or lunges.");
      if (/Sprints/.test(planForDay?.focus || "") && legSets > 12) tips.push("Sprint week + high leg volume. Reduce Friday accessories ~30%.");
      if (!tips.length) tips.push("Great balance this week. Keep it submaximal and crisp form.");
      return tips;
    },[logs, planForDay]);

    function addLog(exercise, reps, load="", rpe="", notes=""){
      const entry = { id: uid(), dateISO: date, exercise, reps, load, rpe, notes };
      setLogs(x => [entry, ...x]);
    }
    function deleteLog(id){ setLogs(x => x.filter(e => e.id !== id)); }

    function exportCSV(){
      const headers = ["dateISO","exercise","reps","load","rpe","notes"];
      const rows = logs.map(l => headers.map(h => l[h] ?? ""));
      const csv = [headers.join(","), ...rows.map(r=>r.join(","))].join("\n");
      const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "workout_logs.csv"; a.click(); URL.revokeObjectURL(url);
    }
    function exportJSON(){
      const payload = { logs, plan, library, food, settings };
      const blob = new Blob([JSON.stringify(payload,null,2)], { type:"application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "hybrid_trainer_backup.json"; a.click(); URL.revokeObjectURL(url);
    }
    function importJSON(){
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = "application/json";
      inp.onchange = () => {
        const file = inp.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try{
            const data = JSON.parse(reader.result);
            if (data.logs) setLogs(data.logs);
            if (data.plan) setPlan(data.plan);
            if (data.library) setLibrary(data.library);
            if (data.food) setFood(data.food);
            if (data.settings) setSettings(data.settings);
            alert("Import complete!");
          } catch(e){ alert("Import failed: " + e.message); }
        };
        reader.readAsText(file);
      };
      inp.click();
    }

    // ===== Food =====
    const dayFood = food[date] || [];
    function saveFoodForDay(items){ setFood(prev => ({ ...prev, [date]: items })); }
    function addFoodItem(item){ saveFoodForDay([...dayFood, { id: uid(), ...item }]); }
    function deleteFood(id){ saveFoodForDay(dayFood.filter(x => x.id !== id)); }
    function quickAddCalories(cals){ addFoodItem({ name:"Quick Add", cals:Number(cals)||0, p:0, c:0, f:0, qty:1, unit:"" }); }
    function estimateFromDescription(text){
      let total = { cals:0,p:0,c:0,f:0 };
      Object.entries(FOOD_DICT).forEach(([k, v])=>{
        if (text.toLowerCase().includes(k)){
          total.cals += v.cals; total.p += v.p; total.c += v.c; total.f += v.f;
        }
      });
      return total;
    }
    async function tryOpenFoodFactsLookup(code){
      try{
        const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data || !data.product) return null;
        const p = data.product; const n = p.nutriments || {};
        return {
          name: p.product_name || "Scanned Item",
          cals: Number(n["energy-kcal_100g"] || n["energy-kcal_serving"] || 0),
          p: Number(n["proteins_100g"] || n["proteins_serving"] || 0),
          c: Number(n["carbohydrates_100g"] || n["carbohydrates_serving"] || 0),
          f: Number(n["fat_100g"] || n["fat_serving"] || 0),
          qty: 1, unit: "serving", barcode: code
        };
      } catch(e){ return null; }
    }

    // ===== Charts =====
    useEffect(()=>{
      if (tab !== "metrics" || typeof Chart === "undefined") return;

      const now = Date.now();
      const byDay = new Map();
      for (let i=13;i>=0;i--){
        const d = new Date(now - i*86400000);
        const key = d.toISOString().slice(0,10);
        byDay.set(key, 0);
      }
      logs.forEach(l => { if (byDay.has(l.dateISO)) byDay.set(l.dateISO, byDay.get(l.dateISO)+1); });
      const setsLabels = Array.from(byDay.keys());
      const setsData = Array.from(byDay.values());
      if (window._metricsChart) window._metricsChart.destroy();
      window._metricsChart = new Chart(document.getElementById("metricsChart"), {
        type: "line",
        data: { labels: setsLabels, datasets: [{ label: "Sets per day (14d)", data: setsData, tension: 0.3 }]},
        options: { responsive: true, maintainAspectRatio: false }
      });

      const byDayMacros = new Map(Array.from(byDay.keys()).map(k=>[k,{cals:0,p:0,c:0,f:0}]));
      Object.entries(food).forEach(([d, items])=>{
        if (!byDayMacros.has(d)) return;
        items.forEach(it => {
          byDayMacros.get(d).cals += Number(it.cals||0);
          byDayMacros.get(d).p += Number(it.p||0);
          byDayMacros.get(d).c += Number(it.c||0);
          byDayMacros.get(d).f += Number(it.f||0);
        });
      });
      const macroLabels = Array.from(byDayMacros.keys());
      const macroData = Array.from(byDayMacros.values()).map(x=>x.cals);
      if (window._macroChart) window._macroChart.destroy();
      window._macroChart = new Chart(document.getElementById("macroChart"), {
        type: "bar",
        data: { labels: macroLabels, datasets: [{ label: "Calories per day (14d)", data: macroData }]},
        options: { responsive: true, maintainAspectRatio: false }
      });

      const last7 = logs.filter(e => (Date.now() - new Date(e.dateISO).getTime())/86400000 <= 7);
      const groups = { push:0, pull:0, legs:0 };
      last7.forEach(l => {
        const ex = (l.exercise||"").toLowerCase();
        if (/press|push|dip|bench|ohp|incline/.test(ex)) groups.push += 1;
        else if (/row|pull/.test(ex)) groups.pull += 1;
        else if (/squat|deadlift|rdl|lunge|hip thrust|calf/.test(ex)) groups.legs += 1;
      });
      if (window._volumeChart) window._volumeChart.destroy();
      window._volumeChart = new Chart(document.getElementById("volumeChart"), {
        type: "doughnut",
        data: { labels: ["Push","Pull","Legs"], datasets: [{ data: [groups.push, groups.pull, groups.legs] }]},
        options: { responsive: true, maintainAspectRatio: false }
      });
    },[tab, logs, food]);

    // ===== UI =====
    return React.createElement("div", null,
      // TODAY
      tab === "today" && React.createElement(motion.div, { initial:{opacity:0,y:8}, animate:{opacity:1,y:0} },
        React.createElement("div", { className:"grid", style:{ gap:"1.5rem", gridTemplateColumns:"1fr 320px" } },
          React.createElement("div", { className:"card" },
            React.createElement("div", { className:"flex items-center justify-between", style:{ gap:".5rem", marginBottom:".75rem" } },
              React.createElement("div", null,
                React.createElement("div", { style:{ fontSize:"20px", fontWeight:600 } }, "Today"),
                React.createElement("div", { className:"text-gray-600", style:{ fontSize:"14px" } }, fmt(date)),
                planForDay && React.createElement("div", { style:{ marginTop:".5rem" } },
                  React.createElement("span", { className:"pill" }, planForDay.focus),
                  React.createElement("span", { className:"text-gray-500", style:{ fontSize:"12px", marginLeft:".5rem" } }, planForDay.notes)
                )
              ),
              React.createElement("input", { className:"rounded-xl border px-4 py-2 focus-ring", type:"date", value:date, onChange:e=>setDate(e.target.value) })
            ),
            React.createElement("div", { className:"grid", style:{ gap:"1rem", gridTemplateColumns:"1fr 1fr" } },
              React.createElement("div", { className:"card", style:{ background:"#f9fafb" } },
                React.createElement("div", { style:{ fontWeight:600, marginBottom:".5rem" } }, "Quick Log"),
                React.createElement(QuickLog, { library, onAdd:addLog })
              ),
              React.createElement("div", { className:"card", style:{ background:"#f9fafb" } },
                React.createElement("div", { style:{ fontWeight:600, marginBottom:".5rem" } }, "Suggested (from Plan)"),
                React.createElement("div", { className:"flex", style:{ gap:".5rem", flexWrap:"wrap" } },
                  (planForDay?.items || []).map(e =>
                    React.createElement("button", { key:e, className:"btn", onClick:()=>addLog(e, 0, "", "", "Started/skill work") }, e)
                  )
                )
              )
            ),
            React.createElement("div", { style:{ marginTop:"1rem" } },
              React.createElement("div", { style:{ fontWeight:600, marginBottom:".5rem" } }, "Today's Sets"),
              dayLogs.length===0 && React.createElement("div", { className:"text-gray-500", style:{ fontSize:"14px" } }, "No sets logged yet. Use Quick Log to add your first set."),
              dayLogs.map(l =>
                React.createElement("div", { key:l.id, className:"card flex items-center justify-between" },
                  React.createElement("div", null,
                    React.createElement("div", { style:{ fontWeight:500 } }, l.exercise),
                    React.createElement("div", { className:"text-gray-600", style:{ fontSize:"14px" } },
                      (l.reps||0) + " reps" + (l.load? (" @ " + l.load) : "") + (l.rpe? (" • RPE " + l.rpe) : "")
                    ),
                    l.notes && React.createElement("div", { className:"text-gray-500", style:{ fontSize:"12px", marginTop:".25rem" } }, l.notes)
                  ),
                  React.createElement("button", { className:"btn danger", onClick:()=>deleteLog(l.id) }, "Delete")
                )
              )
            )
          ),
          React.createElement("div", { className:"card" },
            React.createElement("div", { style:{ fontWeight:600, marginBottom:".5rem" } }, "Today Totals"),
            Object.keys(totals).length === 0 ?
              React.createElement("div", { className:"text-gray-500", style:{ fontSize:"14px" } }, "Totals will appear after you log sets.") :
              Object.entries(totals).map(([ex,t]) =>
                React.createElement("div", { key:ex, className:"flex items-center justify-between", style:{ fontSize:"14px", marginBottom:".25rem" } },
                  React.createElement("span", { style:{ fontWeight:500 } }, ex),
                  React.createElement("span", { className:"text-gray-600" }, t.sets + " sets • " + t.reps + " reps • Vol " + Math.round(t.volume))
                )
              )
          )
        )
      ),

      // PLAN
      tab === "plan" && React.createElement(motion.div, { initial:{opacity:0,y:8}, animate:{opacity:1,y:0} },
        React.createElement("div", { className:"grid", style:{ gap:"1.5rem", gridTemplateColumns:"1fr 1fr" } },
          React.createElement("div", { className:"card" },
            React.createElement("div", { style:{ fontSize:"20px", fontWeight:600, marginBottom:".75rem" } }, "2-Week Structure"),
            React.createElement(PlanEditor, { plan, setPlan })
          ),
          React.createElement("div", { className:"card" },
            React.createElement("div", { style:{ fontSize:"20px", fontWeight:600, marginBottom:".75rem" } }, "Guidelines"),
            React.createElement("ul", { style:{ paddingLeft:"1.25rem", lineHeight:"1.6", fontSize:"14px", color:"#374151" } },
              React.createElement("li", null, "Calisthenics mini-sets at 40–60% effort, never to failure."),
              React.createElement("li", null, "Zone 2 runs 20–40 min; sprints only every other week."),
              React.createElement("li", null, "On sprint week, lighten lower-body accessories by ~20–30%."),
              React.createElement("li", null, "If recovery lags, convert Sunday run to full rest."),
              React.createElement("li", null, "Prioritize hamstrings/posterior chain during the cut.")
            )
          )
        )
      ),

      // LIBRARY
      tab === "library" && React.createElement(motion.div, { initial:{opacity:0,y:8}, animate:{opacity:1,y:0} },
        React.createElement("div", { className:"grid", style:{ gap:"1.5rem", gridTemplateColumns:"1fr 1fr" } },
          React.createElement("div", { className:"card" },
            React.createElement("div", { style:{ fontSize:"20px", fontWeight:600, marginBottom:".75rem" } }, "Exercise Library"),
            React.createElement("div", { style:{ maxHeight:"420px", overflow:"auto" } },
              library.map((e,i) =>
                React.createElement("div", { key:i, className:"flex items-center justify-between", style:{ fontSize:"14px", marginBottom:".25rem" } },
                  React.createElement("div", null,
                    React.createElement("div", { style:{ fontWeight:500 } }, e.name),
                    React.createElement("div", { className:"text-gray-500" }, e.type + (e.unilateral ? " • unilateral" : ""))
                  )
                )
              )
            )
          ),
          React.createElement("div", { className:"card" },
            React.createElement("div", { style:{ fontSize:"20px", fontWeight:600, marginBottom:".75rem" } }, "Add Exercise"),
            React.createElement("div", { className:"grid", style:{ gap:".5rem" } },
              React.createElement("input", { id:"new-ex-name", className:"rounded-xl border px-4 py-2 focus-ring", placeholder:"Name (e.g., Nordic Curl)" }),
              React.createElement("select", { id:"new-ex-type", className:"rounded-xl border px-4 py-2 focus-ring" },
                React.createElement("option", { value:"calisthenics" }, "Calisthenics"),
                React.createElement("option", { value:"weights" }, "Weights"),
                React.createElement("option", { value:"cardio" }, "Cardio")
              ),
              React.createElement("label", { style:{ fontSize:"14px", display:"flex", alignItems:"center", gap:".5rem" } },
                React.createElement("input", { id:"new-ex-uni", type:"checkbox" }), "Unilateral"
              ),
              React.createElement("button", { className:"btn", onClick:()=>{
                const name = document.getElementById('new-ex-name').value.trim();
                const type = document.getElementById('new-ex-type').value;
                const unilateral = document.getElementById('new-ex-uni').checked;
                if (!name) return;
                setLibrary(x => [...x, { name, type, unilateral }]);
                document.getElementById('new-ex-name').value = "";
                document.getElementById('new-ex-uni').checked = false;
              } }, "Add to Library")
            )
          )
        )
      ),

      // HISTORY
      tab === "history" && React.createElement(motion.div, { initial:{opacity:0,y:8}, animate:{opacity:1,y:0} },
        React.createElement("div", { className:"card" },
          React.createElement("div", { style:{ fontSize:"20px", fontWeight:600, marginBottom:".75rem" } }, "History"),
          React.createElement(History, { logs, onDelete: id => deleteLog(id) })
        )
      ),

      // COACH
      tab === "coach" && React.createElement(motion.div, { initial:{opacity:0,y:8}, animate:{opacity:1,y:0} },
        React.createElement("div", { className:"grid", style:{ gap:"1.5rem", gridTemplateColumns:"1fr 1fr" } },
          React.createElement("div", { className:"card" },
            React.createElement("div", { style:{ fontSize:"20px", fontWeight:600, marginBottom:".75rem" } }, "AI Coach (Prototype)"),
            React.createElement("p", { className:"text-gray-600", style:{ fontSize:"14px", marginBottom:".75rem" } }, "Suggestions are generated locally from your last 7 days of entries. For deeper analysis, enable AI in Settings."),
            React.createElement("ul", { style:{ paddingLeft:"1.25rem", lineHeight:"1.6", fontSize:"14px" } },
              coachNotes.map((t,i)=> React.createElement("li", { key:i }, t))
            )
          ),
          React.createElement("div", { className:"card" },
            React.createElement("div", { style:{ fontSize:"20px", fontWeight:600, marginBottom:".75rem" } }, "What do you want help with?"),
            React.createElement("textarea", { className:"rounded-xl border px-4 py-2 focus-ring", placeholder:"e.g., Am I overdoing legs this week? How should I adjust when sore?", style:{ minHeight:"120px", width:"100%" } }),
            React.createElement("div", { className:"text-gray-500", style:{ fontSize:"12px", marginTop:".5rem" } }, "(Offline demo — no data leaves your browser unless you enable AI in Settings.)")
          )
        )
      ),

      // FOOD
      tab === "food" && React.createElement(motion.div, { initial:{opacity:0,y:8}, animate:{opacity:1,y:0} },
        React.createElement("div", { className:"grid", style:{ gap:"1.5rem", gridTemplateColumns:"1fr 1fr" } },
          React.createElement("div", { className:"card" },
            React.createElement("div", { className:"flex items-center justify-between" },
              React.createElement("div", { style:{ fontSize:"20px", fontWeight:600 } }, "Food — ", fmt(date)),
              React.createElement("input", { className:"rounded-xl border px-4 py-2 focus-ring", type:"date", value:date, onChange:e=>setDate(e.target.value) })
            ),
            React.createElement("div", { className:"grid", style:{ gap:".75rem", marginTop:".75rem" } },
              React.createElement("div", { className:"card", style:{ background:"#f9fafb" } },
                React.createElement("div", { style:{ fontWeight:600, marginBottom:".5rem" } }, "Quick Add Calories"),
                React.createElement("div", { className:"flex", style:{ gap:".5rem" } },
                  React.createElement("input", { className:"rounded-xl border px-4 py-2 focus-ring", type:"number", placeholder:"Calories", id:"qa-cals" }),
                  React.createElement("button", { className:"btn", onClick:()=>{
                    const val = document.getElementById('qa-cals').value;
                    quickAddCalories(val);
                    document.getElementById('qa-cals').value = "";
                  } }, "Add")
                )
              ),
              React.createElement("div", { className:"card", style:{ background:"#f9fafb" } },
                React.createElement("div", { style:{ fontWeight:600, marginBottom:".5rem" } }, "Add Exact Macros"),
                React.createElement("div", { className:"grid", style:{ gap:".5rem", gridTemplateColumns:"2fr repeat(4, 1fr)" } },
                  React.createElement("input", { className:"rounded-xl border px-4 py-2 focus-ring", placeholder:"Name (e.g., Chicken thigh 150g)", id:"ex-name" }),
                  React.createElement("input", { className:"rounded-xl border px-4 py-2 focus-ring", type:"number", placeholder:"Cals", id:"ex-c" }),
                  React.createElement("input", { className:"rounded-xl border px-4 py-2 focus-ring", type:"number", placeholder:"P", id:"ex-p" }),
                  React.createElement("input", { className:"rounded-xl border px-4 py-2 focus-ring", type:"number", placeholder:"C", id:"ex-carbs" }),
                  React.createElement("input", { className:"rounded-xl border px-4 py-2 focus-ring", type:"number", placeholder:"F", id:"ex-f" }),
                ),
                React.createElement("button", { className:"btn", style:{ marginTop:".5rem" }, onClick:()=>{
                  const name = document.getElementById('ex-name').value;
                  const c = Number(document.getElementById('ex-c').value||0);
                  const p = Number(document.getElementById('ex-p').value||0);
                  const carbs = Number(document.getElementById('ex-carbs').value||0);
                  const f = Number(document.getElementById('ex-f').value||0);
                  addFoodItem({ name, cals:c, p, c:carbs, f, qty:1, unit:"" });
                  ['ex-name','ex-c','ex-p','ex-carbs','ex-f'].forEach(id=>document.getElementById(id).value="");
                } }, "Add Food")
              ),
              React.createElement(BarcodeCard, { addFoodItem, tryOpenFoodFactsLookup })
            ),
            React.createElement("div", { style:{ marginTop:".75rem" } },
              React.createElement("div", { style:{ fontWeight:600, marginBottom:".5rem" } }, "Today's Food"),
              dayFood.length===0 && React.createElement("div", { className:"text-gray-500", style:{ fontSize:"14px" } }, "No items yet."),
              dayFood.map(it =>
                React.createElement("div", { key:it.id, className:"card flex items-center justify-between" },
                  React.createElement("div", null,
                    React.createElement("div", { style:{ fontWeight:500 } }, it.name || "Food"),
                    React.createElement("div", { className:"text-gray-600", style:{ fontSize:"14px" } },
                      (it.cals||0) + " kcal • P " + (it.p||0) + " • C " + (it.c||0) + " • F " + (it.f||0) + (it.barcode? (" • " + it.barcode) : "")
                    )
                  ),
                  React.createElement("button", { className:"btn danger", onClick:()=>deleteFood(it.id) }, "Delete")
                )
              )
            )
          ),
          React.createElement("div", { className:"card" },
            React.createElement("div", { style:{ fontWeight:600, marginBottom:".5rem" } }, "Today Totals"),
            (function(){
              const agg = dayFood.reduce((a,b)=>({ cals:a.cals+(+b.cals||0), p:a.p+(+b.p||0), c:a.c+(+b.c||0), f:a.f+(+b.f||0) }), {cals:0,p:0,c:0,f:0});
              return React.createElement("div", null,
                React.createElement("div", null, "Calories: " + Math.round(agg.cals)),
                React.createElement("div", null, "Protein: " + Math.round(agg.p) + " g"),
                React.createElement("div", null, "Carbs: " + Math.round(agg.c) + " g"),
                React.createElement("div", null, "Fat: " + Math.round(agg.f) + " g")
              );
            })()
          )
        )
      ),

      // METRICS
      tab === "metrics" && React.createElement(motion.div, { initial:{opacity:0,y:8}, animate:{opacity:1,y:0} },
        React.createElement("div", { className:"grid", style:{ gap:"1.5rem", gridTemplateColumns:"1fr 1fr" } },
          React.createElement("div", { className:"card" },
            React.createElement("div", { style:{ fontSize:"20px", fontWeight:600, marginBottom:".75rem" } }, "Workout Sets (14 days)"),
            React.createElement("div", { style:{ width:"100%", height:"280px" } }, React.createElement("canvas", { id:"metricsChart" }))
          ),
          React.createElement("div", { className:"card" },
            React.createElement("div", { style:{ fontSize:"20px", fontWeight:600, marginBottom:".75rem" } }, "Calories per Day (14 days)"),
            React.createElement("div", { style:{ width:"100%", height:"280px" } }, React.createElement("canvas", { id:"macroChart" }))
          ),
          React.createElement("div", { className:"card", style:{ gridColumn:"1 / span 2" } },
            React.createElement("div", { style:{ fontSize:"20px", fontWeight:600, marginBottom:".75rem" } }, "Volume Mix (last 7 days)"),
            React.createElement("div", { style:{ width:"100%", height:"280px" } }, React.createElement("canvas", { id:"volumeChart" }))
          )
        )
      ),

      // SETTINGS
      tab === "settings" && React.createElement(motion.div, { initial:{opacity:0,y:8}, animate:{opacity:1,y:0} },
        React.createElement("div", { className:"grid", style:{ gap:"1.5rem", gridTemplateColumns:"1fr 1fr" } },
          React.createElement("div", { className:"card" },
            React.createElement("div", { style:{ fontSize:"20px", fontWeight:600, marginBottom:".75rem" } }, "AI & Integrations"),
            React.createElement("div", { className:"grid", style:{ gap:".5rem" } },
              React.createElement("input", { className:"rounded-xl border px-4 py-2 focus-ring", placeholder:"Custom AI endpoint (optional)", value:settings.aiEndpoint, onChange:e=>setSettings({...settings, aiEndpoint:e.target.value}) }),
              React.createElement("input", { className:"rounded-xl border px-4 py-2 focus-ring", placeholder:"API key (stored locally)", value:settings.aiKey, onChange:e=>setSettings({...settings, aiKey:e.target.value}) }),
              React.createElement("label", { className:"text-gray-600", style:{ fontSize:"14px", display:"flex", alignItems:"center", gap:".5rem" } },
                React.createElement("input", { type:"checkbox", checked:settings.allowOpenFoodFacts, onChange:e=>setSettings({...settings, allowOpenFoodFacts:e.target.checked}) }),
                "Use Open Food Facts for barcode lookup when online"
              ),
              React.createElement("div", { className:"text-gray-500", style:{ fontSize:"12px" } }, "Your keys never leave your device except to call your configured endpoint.")
            )
          ),
          React.createElement("div", { className:"card" },
            React.createElement("div", { style:{ fontSize:"20px", fontWeight:600, marginBottom:".75rem" } }, "About"),
            React.createElement("p", { className:"text-gray-600", style:{ fontSize:"14px" } }, "Hybrid Trainer PWA: distributed calisthenics + targeted weights + runs + integrated nutrition tracking.")
          )
        )
      )
    );
  }

  // Components
  function QuickLog({ library, onAdd }){
    const [exercise, setExercise] = React.useState(library[0]?.name || "Push-up");
    const [reps, setReps] = React.useState(10);
    const [load, setLoad] = React.useState("");
    const [rpe, setRpe] = React.useState("");
    const [notes, setNotes] = React.useState("");
    React.useEffect(()=>{ if (!exercise && library.length) setExercise(library[0].name); },[library]);
    return React.createElement("div", { className:"grid", style:{ gap:".5rem" } },
      React.createElement("select", { className:"rounded-xl border px-4 py-2 focus-ring", value:exercise, onChange:e=>setExercise(e.target.value) },
        library.map((e,i)=> React.createElement("option", { key:i, value:e.name }, e.name))
      ),
      React.createElement("div", { className:"grid", style:{ gridTemplateColumns:"repeat(3, 1fr)", gap:".5rem" } },
        React.createElement("input", { className:"rounded-xl border px-4 py-2 focus-ring", type:"number", min:0, value:reps, onChange:e=>setReps(e.target.value), placeholder:"Reps" }),
        React.createElement("input", { className:"rounded-xl border px-4 py-2 focus-ring", type:"text", value:load, onChange:e=>setLoad(e.target.value), placeholder:"Load (e.g., bw, +25lb)" }),
        React.createElement("input", { className:"rounded-xl border px-4 py-2 focus-ring", type:"text", value:rpe, onChange:e=>setRpe(e.target.value), placeholder:"RPE (opt.)" })
      ),
      React.createElement("input", { className:"rounded-xl border px-4 py-2 focus-ring", value:notes, onChange:e=>setNotes(e.target.value), placeholder:"Notes (tempo, pause, etc.)" }),
      React.createElement("button", { className:"btn", onClick:()=>{ onAdd(exercise, reps, load, rpe, notes); setNotes(""); } }, "Add Set")
    );
  }

  function PlanEditor({ plan, setPlan }){
    const [editing, setEditing] = React.useState(plan);
    React.useEffect(()=> setEditing(plan), [plan]);
    function update(idx, field, value){
      const copy = editing.slice(); copy[idx] = { ...copy[idx], [field]: value }; setEditing(copy);
    }
    return React.createElement("div", { className:"grid", style:{ gap:".75rem" } },
      editing.map((p, idx) =>
        React.createElement("div", { key:idx, className:"card", style:{ background:"#f9fafb" } },
          React.createElement("div", { className:"grid", style:{ gap:".5rem", gridTemplateColumns:"auto 1fr 1fr auto auto", alignItems:"center" } },
            React.createElement("div", { style:{ fontWeight:500 } }, "W"+p.week+" "+p.day),
            React.createElement("input", { className:"rounded-xl border px-4 py-2 focus-ring", value:p.focus, onChange:e=>update(idx,"focus",e.target.value) }),
            React.createElement("input", { className:"rounded-xl border px-4 py-2 focus-ring", value:p.items.join(", "), onChange:e=>update(idx,"items", e.target.value.split(',').map(s=>s.trim()).filter(Boolean)) }),
            React.createElement("input", { className:"rounded-xl border px-4 py-2 focus-ring", value:p.notes, onChange:e=>update(idx,"notes",e.target.value) }),
            React.createElement("div", { className:"flex", style:{ gap:".5rem" } },
              React.createElement("button", { className:"btn danger", onClick:()=>{ const copy=editing.slice(); copy.splice(idx,1); setEditing(copy); } }, "Delete"),
              React.createElement("button", { className:"btn", onClick:()=>{ const copy=editing.slice(); copy.splice(idx+1,0,{...p, notes:p.notes+" (copy)"}); setEditing(copy); } }, "Duplicate")
            )
          )
        )
      ),
      React.createElement("div", { className:"flex", style:{ gap:".5rem" } },
        React.createElement("button", { className:"btn", onClick:()=>setPlan(editing) }, "Save Plan"),
        React.createElement("button", { className:"btn secondary", onClick:()=>setEditing(TWO_WEEK_TEMPLATE) }, "Reset to Default")
      )
    );
  }

  function History({ logs, onDelete }){
    const [q, setQ] = React.useState("");
    const filtered = React.useMemo(() => logs.filter(l =>
      (l.exercise||"").toLowerCase().includes(q.toLowerCase()) ||
      (l.notes||"").toLowerCase().includes(q.toLowerCase())
    ), [logs,q]);
    const grouped = React.useMemo(()=>{
      const map = new Map();
      for (const l of filtered){ if (!map.has(l.dateISO)) map.set(l.dateISO, []); map.get(l.dateISO).push(l); }
      return Array.from(map.entries()).sort((a,b)=> a[0] < b[0] ? 1 : -1);
    },[filtered]);
    return React.createElement("div", { className:"grid", style:{ gap:".75rem" } },
      React.createElement("input", { className:"rounded-xl border px-4 py-2 focus-ring", placeholder:"Search logs (exercise/notes)", value:q, onChange:e=>setQ(e.target.value) }),
      grouped.length===0 && React.createElement("div", { className:"text-gray-500", style:{ fontSize:"14px" } }, "No logs yet."),
      grouped.map(([d, items]) =>
        React.createElement("div", { key:d, className:"card" },
          React.createElement("div", { style:{ fontWeight:600 } }, fmt(d)),
          React.createElement("div", { className:"grid", style:{ gap:".5rem", marginTop:".5rem" } },
            items.map(it =>
              React.createElement("div", { key:it.id, className:"flex items-center justify-between", style:{ fontSize:"14px" } },
                React.createElement("div", null,
                  React.createElement("div", { style:{ fontWeight:500 } }, it.exercise),
                  React.createElement("div", { className:"text-gray-600" }, (it.reps||0) + " reps" + (it.load? (" @ " + it.load) : "") + (it.rpe? (" • RPE " + it.rpe) : "")),
                  it.notes && React.createElement("div", { className:"text-gray-500", style:{ fontSize:"12px" } }, it.notes)
                ),
                React.createElement("button", { className:"btn danger", onClick:()=>onDelete(it.id) }, "Delete")
              )
            )
          )
        )
      )
    );
  }

  function BarcodeCard({ addFoodItem, tryOpenFoodFactsLookup }){
    const [supported, setSupported] = React.useState(false);
    const [running, setRunning] = React.useState(false);
    const videoRef = React.useRef(null);
    const detector = React.useRef(null);

    React.useEffect(()=>{
      setSupported('BarcodeDetector' in window);
      if ('BarcodeDetector' in window){
        try{
          detector.current = new window.BarcodeDetector({ formats: ['ean_13','upc_a','upc_e','ean_8','code_128','code_39'] });
        } catch(e){}
      }
      return ()=> stop();
    },[]);

    async function start(){
      if (!videoRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      videoRef.current.srcObject = stream; await videoRef.current.play();
      setRunning(true);
      tick();
    }
    function stop(){
      setRunning(false);
      const v = videoRef.current;
      if (v && v.srcObject){ v.srcObject.getTracks().forEach(t=>t.stop()); v.srcObject = null; }
    }
    async function tick(){
      if (!running || !detector.current) return;
      try{
        const barcodes = await detector.current.detect(videoRef.current);
        if (barcodes && barcodes.length){
          const code = barcodes[0].rawValue;
          stop();
          const off = await tryOpenFoodFactsLookup(code);
          if (off){
            addFoodItem(off);
            alert("Added from barcode: " + off.name);
          } else {
            alert("Barcode read: " + code + ". No lookup found; add manually.");
          }
          return;
        }
      } catch(e){ /* ignore */ }
      requestAnimationFrame(tick);
    }

    return React.createElement("div", { className:"card", style:{ background:"#f9fafb" } },
      React.createElement("div", { style:{ fontWeight:600, marginBottom:".5rem" } }, "Scan Barcode"),
      !supported && React.createElement("div", { className:"text-gray-500", style:{ fontSize:"14px" } }, "Barcode scanning not supported on this device/browser."),
      supported && React.createElement("div", null,
        React.createElement("div", { className:"flex", style:{ gap:".5rem", marginBottom:".5rem" } },
          !running ? React.createElement("button", { className:"btn", onClick:start }, "Start Camera") :
                     React.createElement("button", { className:"btn danger", onClick:stop }, "Stop")
        ),
        React.createElement("video", { ref:videoRef, style:{ width:"100%", borderRadius:"12px" }, muted:true })
      )
    );
  }

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(App));
  window.AppAPI = window.AppAPI || {};
})();
