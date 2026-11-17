/* CreationFirst, hero-demo.js
   Live-Simulation im Hero: eine Beispielanfrage wird getippt, in Felder
   sortiert und zu einem Entwurf vorbereitet. Der Besucher gibt am Ende selbst
   frei. Alle Inhalte sind erfundene Beispiele (auf der Seite so gekennzeichnet).
   Texte je Sprache (de, en, hr) in DATA; die Sprache kommt aus <html lang>.
   Der Platz für alle Inhalte ist von Anfang an reserviert, damit nichts springt. */
(function () {
  "use strict";

  var root = document.querySelector("[data-live-demo]");
  if (!root) return;

  var DATA = {
    de: {
      status: ["Anfrage kommt rein …", "Angaben werden sortiert …", "Entwurf wird vorbereitet …", "Wartet auf deine Freigabe."],
      scenarios: {
        elektro: {
          from: "Familie Brandt · Website-Formular",
          text: "Hallo, wir bräuchten eine Wallbox für unseren Carport in Köln-Sülz. Der Zählerschrank ist von 1998. Ginge was im März? Am besten vormittags anrufen. Danke!",
          fields: [["Kunde", "Familie Brandt"], ["Anliegen", "Wallbox am Carport"], ["Ort", "Köln-Sülz"], ["Wunschtermin", "März, vormittags"], ["Hinweis", "Zählerschrank von 1998 prüfen"]],
          draftTitle: "Angebotsentwurf · Wallbox-Installation",
          lines: ["Vor-Ort-Termin mit Prüfung des Zählerschranks", "Wallbox inklusive Montage am Carport", "Anmeldung beim Netzbetreiber"],
          sent: "Angebot ist raus an Familie Brandt."
        },
        restaurant: {
          from: "Jana Müller · E-Mail",
          text: "Guten Abend, wir möchten am 14. Juni mit 24 Personen den 60. Geburtstag meines Vaters feiern. Gibt es ein Menü, auch vegetarisch? Zwei Gäste haben eine Nussallergie.",
          fields: [["Kundin", "Jana Müller"], ["Anlass", "60. Geburtstag, 24 Personen"], ["Bereich", "Nebenraum"], ["Wunschtermin", "14. Juni, abends"], ["Hinweis", "Vegetarisch, 2 × Nussallergie"]],
          draftTitle: "Angebotsentwurf · Feier im Nebenraum",
          lines: ["Nebenraum für 24 Personen vorgemerkt", "Drei-Gänge-Menü mit vegetarischer Variante", "Allergiehinweis für die Küche notiert"],
          sent: "Angebot ist raus an Jana Müller."
        },
        praxis: {
          from: "Herr Yilmaz · Kontaktformular",
          text: "Hallo, ich habe eine Verordnung über 6 x Krankengymnastik nach einer Knie-OP. Ich kann nur nach 17 Uhr. Muss ich etwas mitbringen?",
          fields: [["Patient", "Herr Yilmaz"], ["Anliegen", "6 × Krankengymnastik"], ["Anlass", "Nach Knie-OP"], ["Wunschtermin", "Werktags ab 17 Uhr"], ["Hinweis", "Fragt, was mitzubringen ist"]],
          draftTitle: "Terminvorschlag · 6 Behandlungen",
          lines: ["Drei freie Abendtermine zur Auswahl", "Hinweis: Verordnung und Handtuch mitbringen", "Erinnerung am Vortag eingeplant"],
          sent: "Terminvorschlag ist raus an Herrn Yilmaz."
        }
      }
    },
    en: {
      status: ["Inquiry coming in …", "Sorting the details …", "Preparing the draft …", "Waiting for your approval."],
      scenarios: {
        elektro: {
          from: "The Brandt family · website form",
          text: "Hi, we need a wallbox for our carport in Cologne-Sülz. The meter cabinet dates from 1998. Could you do it in March? Mornings are best for a call. Thanks!",
          fields: [["Customer", "The Brandt family"], ["Request", "Wallbox at the carport"], ["Location", "Cologne-Sülz"], ["Preferred date", "March, mornings"], ["Note", "Check the 1998 meter cabinet"]],
          draftTitle: "Draft quote · wallbox installation",
          lines: ["On-site visit to check the meter cabinet", "Wallbox including installation at the carport", "Registration with the grid operator"],
          sent: "Quote sent to the Brandt family."
        },
        restaurant: {
          from: "Jana Müller · email",
          text: "Good evening, we would like to celebrate my father's 60th birthday on 14 June with 24 guests. Is there a set menu, also vegetarian? Two guests have a nut allergy.",
          fields: [["Customer", "Jana Müller"], ["Occasion", "60th birthday, 24 guests"], ["Area", "Private room"], ["Preferred date", "14 June, evening"], ["Note", "Vegetarian, 2 × nut allergy"]],
          draftTitle: "Draft quote · private room celebration",
          lines: ["Private room held for 24 guests", "Three-course menu with a vegetarian option", "Allergy note passed to the kitchen"],
          sent: "Quote sent to Jana Müller."
        },
        praxis: {
          from: "Mr Yilmaz · contact form",
          text: "Hello, I have a prescription for 6 physiotherapy sessions after knee surgery. I can only come after 5 pm. Do I need to bring anything?",
          fields: [["Patient", "Mr Yilmaz"], ["Request", "6 × physiotherapy"], ["Reason", "After knee surgery"], ["Preferred time", "Weekdays after 5 pm"], ["Note", "Asks what to bring"]],
          draftTitle: "Appointment proposal · 6 sessions",
          lines: ["Three free evening slots to choose from", "Note: bring the prescription and a towel", "Reminder scheduled for the day before"],
          sent: "Appointment proposal sent to Mr Yilmaz."
        }
      }
    },
    hr: {
      status: ["Upit stiže …", "Podaci se razvrstavaju …", "Nacrt se priprema …", "Čeka tvoje odobrenje."],
      scenarios: {
        elektro: {
          from: "Obitelj Horvat · obrazac na webu",
          text: "Pozdrav, trebamo punjač za električni auto u garaži u Splitu. Razvodni ormar je iz 1998. Može li u ožujku? Najbolje nas nazovite prijepodne. Hvala!",
          fields: [["Klijent", "Obitelj Horvat"], ["Upit", "Punjač u garaži"], ["Lokacija", "Split"], ["Željeni termin", "Ožujak, prijepodne"], ["Napomena", "Provjeriti razvodni ormar iz 1998."]],
          draftTitle: "Nacrt ponude · ugradnja punjača",
          lines: ["Izlazak na teren i provjera razvodnog ormara", "Punjač s montažom u garaži", "Prijava operatoru mreže"],
          sent: "Ponuda je poslana obitelji Horvat."
        },
        restaurant: {
          from: "Jana Marić · e-pošta",
          text: "Dobra večer, 14. lipnja želimo s 24 osobe proslaviti 60. rođendan mog oca. Imate li meni, i vegetarijanski? Dvoje gostiju ima alergiju na orašaste plodove.",
          fields: [["Klijentica", "Jana Marić"], ["Povod", "60. rođendan, 24 osobe"], ["Prostor", "Zasebna sala"], ["Željeni termin", "14. lipnja, navečer"], ["Napomena", "Vegetarijanski, 2 × alergija na orašaste plodove"]],
          draftTitle: "Nacrt ponude · proslava u zasebnoj sali",
          lines: ["Zasebna sala rezervirana za 24 osobe", "Meni od tri slijeda s vegetarijanskom opcijom", "Napomena o alergiji proslijeđena kuhinji"],
          sent: "Ponuda je poslana Jani Marić."
        },
        praxis: {
          from: "Gospodin Kovač · kontakt obrazac",
          text: "Pozdrav, imam uputnicu za 6 fizikalnih terapija nakon operacije koljena. Mogu samo nakon 17 sati. Trebam li što ponijeti?",
          fields: [["Pacijent", "Gospodin Kovač"], ["Upit", "6 × fizikalna terapija"], ["Razlog", "Nakon operacije koljena"], ["Željeni termin", "Radnim danom nakon 17 h"], ["Napomena", "Pita što treba ponijeti"]],
          draftTitle: "Prijedlog termina · 6 terapija",
          lines: ["Tri slobodna večernja termina na izbor", "Napomena: ponijeti uputnicu i ručnik", "Podsjetnik zakazan za dan prije"],
          sent: "Prijedlog termina poslan je gospodinu Kovaču."
        }
      }
    }
  };
  var lang = (document.documentElement.lang || "de").slice(0, 2);
  var L = DATA[lang] || DATA.de;
  var SCENARIOS = L.scenarios;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tabs = root.querySelectorAll("[data-scenario]");
  var steps = root.querySelectorAll(".ld-steps li");
  var fromEl = root.querySelector(".ld-from");
  var typedEl = root.querySelector(".ld-typed");
  var restEl = root.querySelector(".ld-rest");
  var fieldsEl = root.querySelector(".ld-fields");
  var draftEl = root.querySelector(".ld-draft");
  var draftTitleEl = root.querySelector(".ld-draft-title");
  var linesEl = root.querySelector(".ld-lines");
  var approveBtn = root.querySelector(".ld-approve");
  var statusEl = root.querySelector(".ld-status");
  var replayBtn = root.querySelector(".ld-replay");
  var doneEl = root.querySelector(".ld-done");

  var runId = 0;
  var current = "elektro";

  function wait(ms, id) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () { id === runId ? resolve() : reject(new Error("cancelled")); }, reduceMotion ? 0 : ms);
    });
  }

  function setStep(n) {
    steps.forEach(function (li, i) {
      li.classList.toggle("is-done", i < n);
      li.classList.toggle("is-active", i === n);
    });
    root.style.setProperty("--ld-progress", String(Math.min(n, steps.length - 1) / (steps.length - 1)));
  }

  function build(s) {
    fromEl.textContent = s.from;
    typedEl.textContent = "";
    restEl.textContent = s.text;
    fieldsEl.innerHTML = "";
    s.fields.forEach(function (f) {
      var div = document.createElement("div");
      var dt = document.createElement("dt");
      var dd = document.createElement("dd");
      dt.textContent = f[0];
      dd.textContent = f[1];
      div.appendChild(dt);
      div.appendChild(dd);
      fieldsEl.appendChild(div);
    });
    draftTitleEl.textContent = s.draftTitle;
    linesEl.innerHTML = "";
    s.lines.forEach(function (line) {
      var li = document.createElement("li");
      li.textContent = line;
      linesEl.appendChild(li);
    });
    draftEl.classList.remove("is-in");
    root.classList.remove("is-typing", "is-ready", "is-sent");
    approveBtn.disabled = true;
    statusEl.textContent = L.status[0];
    doneEl.hidden = true;
  }

  function type(text, id) {
    if (reduceMotion) {
      typedEl.textContent = text;
      restEl.textContent = "";
      return Promise.resolve();
    }
    return new Promise(function (resolve, reject) {
      var i = 0;
      function tick() {
        if (id !== runId) return reject(new Error("cancelled"));
        i = Math.min(text.length, i + 2);
        typedEl.textContent = text.slice(0, i);
        restEl.textContent = text.slice(i);
        if (i < text.length) setTimeout(tick, 22);
        else resolve();
      }
      tick();
    });
  }

  function revealAll(nodes, gap, id) {
    var p = Promise.resolve();
    Array.prototype.forEach.call(nodes, function (node) {
      p = p.then(function () { node.classList.add("is-in"); return wait(gap, id); });
    });
    return p;
  }

  function play(key) {
    var s = SCENARIOS[key];
    if (!s) return;
    current = key;
    var id = ++runId;
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-scenario") === key;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-pressed", on ? "true" : "false");
    });
    build(s);
    setStep(0);
    root.classList.add("is-typing");

    wait(350, id)
      .then(function () { return type(s.text, id); })
      .then(function () {
        root.classList.remove("is-typing");
        setStep(1);
        statusEl.textContent = L.status[1];
        return wait(350, id);
      })
      .then(function () { return revealAll(fieldsEl.children, 190, id); })
      .then(function () {
        setStep(2);
        statusEl.textContent = L.status[2];
        return wait(350, id);
      })
      .then(function () {
        draftEl.classList.add("is-in");
        return revealAll(linesEl.children, 260, id);
      })
      .then(function () {
        setStep(3);
        root.classList.add("is-ready");
        approveBtn.disabled = false;
        statusEl.textContent = L.status[3];
      })
      .catch(function () { /* durch neuen Durchlauf abgelöst */ });
  }

  approveBtn.addEventListener("click", function () {
    if (approveBtn.disabled) return;
    runId++;
    approveBtn.disabled = true;
    root.classList.remove("is-ready");
    root.classList.add("is-sent");
    setStep(4);
    statusEl.textContent = SCENARIOS[current].sent;
    doneEl.hidden = false;
  });

  tabs.forEach(function (t) {
    t.addEventListener("click", function () { play(t.getAttribute("data-scenario")); });
  });
  if (replayBtn) replayBtn.addEventListener("click", function () { play(current); });

  // Erst starten, wenn das Fenster sichtbar ist (auf dem Handy liegt es unter dem Text).
  if ("IntersectionObserver" in window) {
    var started = false;
    build(SCENARIOS[current]);
    setStep(0);
    var io = new IntersectionObserver(function (entries) {
      if (!started && entries[0].isIntersecting) {
        started = true;
        io.disconnect();
        play(current);
      }
    }, { threshold: 0.35 });
    io.observe(root);
  } else {
    play(current);
  }
})();
