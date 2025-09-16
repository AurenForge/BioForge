(function(){
  const { useState, useEffect, useMemo } = React;
  // Graceful fallback if framer-motion isn't loaded
  const motion = (window.framerMotion && window.framerMotion.motion) || {
    div: (props) => React.createElement("div", props),
  };

  function useLocal(key, init){
    const [val, setVal] = useState(()=>{ 
      try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : init; } 
      catch(e){ return init; } 
    });
    useEffect(()=>{ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} },[key,val]);
    return [val, setVal];
  }

  const DEFAULT_EXERCISES = [
    { name: "Push-up", type: "calisthenics" },
    { name: "Pull-up", type: "calisthenics" },
    { name: "Squat", type: "calisthenics" },
    { name: "Bench Press", type: "weights" },
    { name: "Deadlift", type: "weights" },
    { name: "Zone 2 Run", type: "cardio" },
    { name: "Sprints", type: "cardio" },
  ];

  function todayISO(){ return new Date().toISOString().slice(0,10); }
  function uid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }

  function App(){
    const [tab, setTab] = useState("today");
    const [logs, setLogs] = useLocal("logs:v1", []);
    const [date, setDate] = useState(todayISO());

    const dayLogs = useMemo(()=> logs.filter(l => l.dateISO === date), [logs, date]);

    function addLog(exercise, reps){
      const entry = { id: uid(), dateISO: date, exercise, reps };
      setLogs(x => [entry, ...x]);
    }

    return React.createElement("div", null,
      React.createElement("div", {className:"tabs"},
        ["today","plan","food","metrics"].map(t =>
          React.createElement("button",{onClick:()=>setTab(t), key:t}, t)
        )
      ),
      tab==="today" && React.createElement("div", null,
        React.createElement("h2",null,"Today"),
        React.createElement("button",{onClick:()=>addLog("Push-up",10)},"+10 Push-ups"),
        React.createElement("ul",null,
          dayLogs.map(l=>React.createElement("li",{key:l.id},`${l.exercise}: ${l.reps}`))
        )
      ),
      tab==="metrics" && React.createElement("div",null,
        React.createElement("h2",null,"Metrics"),
        React.createElement("p",null,`You’ve logged ${logs.length} sets total.`)
      )
    );
  }

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(App));
})();
