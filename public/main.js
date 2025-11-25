import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, addDoc, updateDoc, query, where, setLogLevel, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// 1. CONFIGURATION & CONSTANTS
// ==========================================
const CONSTANTS = {
    BOARD_ROWS: 8,
    BOARD_COLS: 10,
    NEXUS_HP: 3,
    BUILDING_HP: 1,
    COST: { PYLON: 1, MIRROR: 1 },
    NEXUS_RANGE: 3,
    COLORS: ['Red', 'Yellow', 'Blue', 'Green', 'Purple', 'Orange', 'Pink', 'Cyan'],
    COLOR_MAP: {
        'Red':    { bg: 'bg-red-900/20',    stroke: 'stroke-rose-400',    border: 'border-rose-400',    text: 'text-rose-400' },
        'Yellow': { bg: 'bg-yellow-900/20', stroke: 'stroke-yellow-400',  border: 'border-yellow-400',  text: 'text-yellow-400' },
        'Blue':   { bg: 'bg-blue-900/20',   stroke: 'stroke-blue-400',    border: 'border-blue-400',    text: 'text-blue-400' },
        'Green':  { bg: 'bg-green-900/20',  stroke: 'stroke-green-400',   border: 'border-green-400',   text: 'text-green-400' },
        'Purple': { bg: 'bg-purple-900/20', stroke: 'stroke-purple-400',  border: 'border-purple-400',  text: 'text-purple-400' },
        'Orange': { bg: 'bg-orange-900/20', stroke: 'stroke-orange-400',  border: 'border-orange-400',  text: 'text-orange-400' },
        'Pink':   { bg: 'bg-pink-900/20',   stroke: 'stroke-pink-400',    border: 'border-pink-400',    text: 'text-pink-400' },
        'Cyan':   { bg: 'bg-cyan-900/20',   stroke: 'stroke-cyan-400',    border: 'border-cyan-400',    text: 'text-cyan-400' }
    },
    // Used for Laser Physics Logic (Reflection Map Keys/Values)
    VECTORS: {
        'fromN': "1,0", 'fromNE': "1,-1", 'fromE': "0,-1", 'fromSE': "-1,-1",
        'fromS': "-1,0", 'fromSW': "-1,1", 'fromW': "0,1", 'fromNW': "1,1",
        'toN': [-1, 0], 'toNE': [-1,1], 'toE': [0,1], 'toSE': [1,1],
        'toS': [1,0], 'toSW': [1,-1], 'toW': [0,-1], 'toNW': [-1,-1]
    },
    // Used for AI and General Direction handling
    DIRECTIONS: {
        'N': [-1, 0], 'NE': [-1, 1], 'E': [0, 1], 'SE': [1, 1],
        'S': [1, 0], 'SW': [1, -1], 'W': [0, -1], 'NW': [-1, -1]
    },
    SVGS: {
        NEXUS: `<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>`,
        PYLON: `<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L7 22h10L12 2z"></path></svg>`,
        MIRROR_SHAPES: {
            'N': `<path d="M0 18 L6 24 L18 24 L24 18 L24 15 L0 15 Z" />`,
            'E': `<path d="M6 0 L0 6 L0 18 L6 24 L9 24 L9 0 Z" />`,
            'S': `<path d="M0 6 L6 0 L18 0 L24 6 L24 9 L0 9 Z" />`,
            'W': `<path d="M18 0 L24 6 L24 18 L18 24 L15 24 L15 0 Z" />`,
            'NE': `<polygon points="0,0 0,24 24,24" />`,
            'SE': `<polygon points="0,0 24,0 0,24" />`,
            'SW': `<polygon points="0,0 24,0 24,24" />`,
            'NW': `<polygon points="0,24 24,24 24,0" />`
        }
    },
    LASER_COLORS: {
        'Red': '#ff0000', 'Yellow': '#eab308', 'Blue': '#0000ff', 'Green': '#00ff00',
        'Purple': '#be00ff', 'Orange': '#ff7f00', 'Pink': '#ff00bf', 'Cyan': '#00ffff'
    },
    APP_ID: 'zero-sum-defense-v1'
};

CONSTANTS.REFLECTION_MAP = {
    'N': {
        [CONSTANTS.VECTORS.fromNW]: CONSTANTS.VECTORS.toNE, [CONSTANTS.VECTORS.fromN]: CONSTANTS.VECTORS.toN,
        [CONSTANTS.VECTORS.fromNE]: CONSTANTS.VECTORS.toNW, [CONSTANTS.VECTORS.fromE]: "DESTROY",
        [CONSTANTS.VECTORS.fromSE]: "DESTROY", [CONSTANTS.VECTORS.fromS]: "DESTROY",
        [CONSTANTS.VECTORS.fromSW]: "DESTROY", [CONSTANTS.VECTORS.fromW]: "DESTROY"
    },
    'NE': {
        [CONSTANTS.VECTORS.fromN]: CONSTANTS.VECTORS.toE, [CONSTANTS.VECTORS.fromNE]: CONSTANTS.VECTORS.toNE,
        [CONSTANTS.VECTORS.fromE]: CONSTANTS.VECTORS.toN, [CONSTANTS.VECTORS.fromSE]: "DESTROY",
        [CONSTANTS.VECTORS.fromS]: "DESTROY", [CONSTANTS.VECTORS.fromSW]: "DESTROY",
        [CONSTANTS.VECTORS.fromW]: "DESTROY", [CONSTANTS.VECTORS.fromNW]: "DESTROY"
    },
    'E': {
        [CONSTANTS.VECTORS.fromNE]: CONSTANTS.VECTORS.toSE, [CONSTANTS.VECTORS.fromE]: CONSTANTS.VECTORS.toE,
        [CONSTANTS.VECTORS.fromSE]: CONSTANTS.VECTORS.toNE, [CONSTANTS.VECTORS.fromS]: "DESTROY",
        [CONSTANTS.VECTORS.fromSW]: "DESTROY", [CONSTANTS.VECTORS.fromW]: "DESTROY",
        [CONSTANTS.VECTORS.fromNW]: "DESTROY", [CONSTANTS.VECTORS.fromN]: "DESTROY"
    },
    'SE': {
        [CONSTANTS.VECTORS.fromE]: CONSTANTS.VECTORS.toS, [CONSTANTS.VECTORS.fromSE]: CONSTANTS.VECTORS.toSE,
        [CONSTANTS.VECTORS.fromS]: CONSTANTS.VECTORS.toE, [CONSTANTS.VECTORS.fromSW]: "DESTROY",
        [CONSTANTS.VECTORS.fromW]: "DESTROY", [CONSTANTS.VECTORS.fromNW]: "DESTROY",
        [CONSTANTS.VECTORS.fromN]: "DESTROY", [CONSTANTS.VECTORS.fromNE]: "DESTROY",
    },
    'S': {
        [CONSTANTS.VECTORS.fromSE]: CONSTANTS.VECTORS.toSW, [CONSTANTS.VECTORS.fromS]: CONSTANTS.VECTORS.toS,
        [CONSTANTS.VECTORS.fromSW]: CONSTANTS.VECTORS.toSE, [CONSTANTS.VECTORS.fromW]: "DESTROY",
        [CONSTANTS.VECTORS.fromNW]: "DESTROY", [CONSTANTS.VECTORS.fromN]: "DESTROY",
        [CONSTANTS.VECTORS.fromNE]: "DESTROY", [CONSTANTS.VECTORS.fromE]: "DESTROY"
    },
    'SW': {
        [CONSTANTS.VECTORS.fromS]: CONSTANTS.VECTORS.toW, [CONSTANTS.VECTORS.fromSW]: CONSTANTS.VECTORS.toSW,
        [CONSTANTS.VECTORS.fromW]: CONSTANTS.VECTORS.toS, [CONSTANTS.VECTORS.fromNW]: "DESTROY",
        [CONSTANTS.VECTORS.fromN]: "DESTROY", [CONSTANTS.VECTORS.fromNE]: "DESTROY",
        [CONSTANTS.VECTORS.fromE]: "DESTROY", [CONSTANTS.VECTORS.fromSE]: "DESTROY"
    },
    'W': {
        [CONSTANTS.VECTORS.fromSW]: CONSTANTS.VECTORS.toNW, [CONSTANTS.VECTORS.fromW]: CONSTANTS.VECTORS.toW,
        [CONSTANTS.VECTORS.fromNW]: CONSTANTS.VECTORS.toSW, [CONSTANTS.VECTORS.fromN]: "DESTROY",
        [CONSTANTS.VECTORS.fromNE]: "DESTROY", [CONSTANTS.VECTORS.fromE]: "DESTROY",
        [CONSTANTS.VECTORS.fromSE]: "DESTROY", [CONSTANTS.VECTORS.fromS]: "DESTROY"
    },
    'NW': {
        [CONSTANTS.VECTORS.fromW]: CONSTANTS.VECTORS.toN, [CONSTANTS.VECTORS.fromNW]: CONSTANTS.VECTORS.toNW,
        [CONSTANTS.VECTORS.fromN]: CONSTANTS.VECTORS.toW, [CONSTANTS.VECTORS.fromNE]: "DESTROY",
        [CONSTANTS.VECTORS.fromE]: "DESTROY", [CONSTANTS.VECTORS.fromSE]: "DESTROY",
        [CONSTANTS.VECTORS.fromS]: "DESTROY", [CONSTANTS.VECTORS.fromSW]: "DESTROY"
    }
}

// ==========================================
// 2. GLOBAL STATE
// ==========================================
const State = {
    db: null,
    auth: null,
    currentUser: null,
    gameId: null,
    
    serverState: null,
    game: null,        
    playerIndex: -1,
    
    // Tracker for Context Switches
    lastKnownTurn: -1,
    lastKnownPhase: null,
    
    // AI Memory
    botMemory: {
        wasHitLastTurn: false,
        lastHitMirror: null
    },
    
    currentAction: null,
    selectedLocation: null,
    currentMirrorOrientation: 'N',
    previewNexus: null, // Only used during setup phase
    
    subs: {
        game: null,
        online: null,
        invites: null,
        lobbyList: null
    },
    intervals: {
        heartbeat: null
    }
};

// ==========================================
// 3. DOM ELEMENTS (Cached)
// ==========================================
const DOM = {
    $: (s) => document.querySelector(s),
    $$: (s) => document.querySelectorAll(s),
    
    // Views
    views: {
        profile: document.querySelector('#profile-view'),
        lobby: document.querySelector('#lobby-view'),
        lobbyList: document.querySelector('#lobby-list-view'),
        singleplayer: document.querySelector('#singleplayer-view'),
        waitingRoom: document.querySelector('#waiting-room-view'),
        game: document.querySelector('#game-view'),
        modal: document.querySelector('#modal-view')
    },
    
    // Inputs & Dynamic Areas
    lobbyListContainer: document.querySelector('#lobby-list-container'),
    onlineLists: document.querySelectorAll('.online-players-list'),
    gameBoard: document.querySelector('#game-board'),
    gameLog: document.querySelector('#game-log'),

    // Lobby View
    lobbyNameDisplay: document.querySelector('#lobby-user-name-display'),
    lobbyNameEdit: document.querySelector('#lobby-user-name-edit'),
    lobbyNameInput: document.querySelector('#lobby-name-input'),
    lobbyColorInput: document.querySelector('#lobby-color-input'),
    
    // SP View
    spEnergySelect: document.querySelector('#sp-energy-select'),
    spNexusHpSelect: document.querySelector('#sp-nexus-hp-select'),

    // Waiting Room
    waitingNexusHpSelect: document.querySelector('#waiting-nexus-hp-select'),

    // Text Displays
    userId: document.querySelector('#user-id-display'),
    userName: document.querySelector('#user-display-name-display'),
    gameId: document.querySelector('#game-id-display'),
    playerHudLabel: document.querySelector('#player-hud-label'),
    playerHudInfo: document.querySelector('#player-hud-info'),
    opponentHudLabel: document.querySelector('#opponent-hud-label'),
    opponentHudInfo: document.querySelector('#opponent-hud-info'),
    phase: document.querySelector('#current-phase'),
    energy: document.querySelector('#energy-pool'),
    budget: document.querySelector('#player-budget'),
    modalMsg: document.querySelector('#modal-message')
};

// ==========================================
// 4. GAME LOGIC
// ==========================================
const GameLogic = {
    getUnitAt: (r, c, gameData) => {
        if (!gameData || !gameData.players) return null;
        for (let i = 0; i < gameData.players.length; i++) {
            const p = gameData.players[i];
            if (!p) continue;
            // Check Nexus
            if (p.nexusLocation && p.nexusLocation[0] === r && p.nexusLocation[1] === c) {
                return { type: 'nexus', hp: p.nexusHP, ownerIdx: i };
            }
            // Check Buildings
            const b = p.buildings.find(b => b.location[0] === r && b.location[1] === c);
            if (b) return { ...b, ownerIdx: i };
        }
        return null;
    },

    isValidNexusMove: (startLoc, targetLoc, playerIndex, gameData) => {
        if (!startLoc || !targetLoc) return false;
        const p = gameData.players[playerIndex];
        
        // 1. Always calc range from the Start of Turn location
        const [rS, cS] = p.nexusStartLoc || startLoc; 
        const [rT, cT] = targetLoc;

        // Zone check
        if (gameData.players.length > 1) {
            const myZoneStart = (playerIndex === 0) ? 0 : 5;
            const myZoneEnd = (playerIndex === 0) ? 5 : CONSTANTS.BOARD_COLS;
            if (cT < myZoneStart || cT >= myZoneEnd) {
                return false; 
            }
        }
        
        // 2. Pathfinding must ignore the player's *current* Nexus location as an obstacle
        const pathDist = GameLogic.findShortestPath([rS, cS], [rT, cT], gameData, playerIndex);
        if (pathDist > CONSTANTS.NEXUS_RANGE) return false;

        const unit = GameLogic.getUnitAt(rT, cT, gameData);
        // Target must be empty or self
        if (unit && unit.type !== 'nexus') return false;
        if (unit && unit.type === 'nexus' && unit.ownerIdx !== playerIndex) return false;
        
        return true;
    },

    findShortestPath: (startLoc, targetLoc, gameData, playerIndex) => {
        const [startR, startC] = startLoc;
        const [targetR, targetC] = targetLoc;

        let queue = [[startR, startC, 0]]; // [r, c, distance]
        let visited = new Set();
        visited.add(`${startR},${startC}`);

        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; 

        while (queue.length > 0) {
            const [r, c, dist] = queue.shift();

            if (r === targetR && c === targetC) return dist;
            if (dist >= CONSTANTS.NEXUS_RANGE) continue;

            for (const [dr, dc] of directions) {
                const nr = r + dr;
                const nc = c + dc;
                const key = `${nr},${nc}`;

                if (nr < 0 || nr >= CONSTANTS.BOARD_ROWS || nc < 0 || nc >= CONSTANTS.BOARD_COLS || visited.has(key))
                    continue;

                visited.add(key);

                const unit = GameLogic.getUnitAt(nr, nc, gameData);
                const isTarget = (nr === targetR && nc === targetC);
                const isMyNexus = unit && unit.type === 'nexus' && unit.ownerIdx === playerIndex;

                if (unit && !isTarget && !isMyNexus)
                    continue;
                
                queue.push([nr, nc, dist + 1]);
            }
        }
        return Infinity;
    },

    traceLaser: (startLoc, direction, gameData) => {
        let [r, c] = startLoc;
        let [dx, dy] = direction;
        let path = [[r, c]];
        let hits = [];
        let log = [];
        
        const simGame = JSON.parse(JSON.stringify(gameData)); 

        for (let i = 0; i < 40; i++) {
            r += dx; c += dy;
            path.push([r, c]);

            const rOut = r < 0 || r >= CONSTANTS.BOARD_ROWS;
            const cOut = c < 0 || c >= CONSTANTS.BOARD_COLS;

            if (cOut) {
                log.push({ msg: "Laser escaped the system (MISS).", audience: "public" });
                break; 
            }

            if (rOut) {
                if (dy === 0) {
                    log.push({ msg: "Laser escaped the system (MISS).", audience: "public" });
                    break; 
                } else {
                    const [prevR, prevC] = path[path.length - 2];
                    let ownerIdx = -1;
                    if (gameData.players.length > 1) {
                        ownerIdx = (prevC < 5) ? 0 : 1;
                    } else {
                        ownerIdx = 0; 
                    }
                    if (ownerIdx !== -1) {
                        log.push({ msg: "Laser reflected off side boundary.", audience: `p${ownerIdx}` });
                    }
                    r = prevR;
                    c = prevC + dy;
                    path[path.length - 1] = [r, c]; 
                    const cOut = c < 0 || c >= CONSTANTS.BOARD_COLS;
                    if (cOut) {
                        log.push({ msg: "Laser escaped the system (MISS).", audience: "public" });
                        break; 
                    }
                    dx = -dx; 
                    direction = [dx, dy];
                }
            }

            const unit = GameLogic.getUnitAt(r, c, simGame);
            if (unit) {
                const ownerName = simGame.players[unit.ownerIdx].displayName;
                if (unit.type === 'nexus') {
                    log.push({ msg: `HIT ${ownerName}'s Nexus!`, audience: "public" });
                    hits.push(unit);
                    unit.hp--;
                    break; 
                } else if (unit.type === 'pylon') {
                    log.push({ msg: `HIT ${ownerName}'s Pylon!`, audience: "public" });
                    hits.push(unit);
                    break;
                } else if (unit.type === 'mirror') {
                    const orientation = unit.orientation || 'N';
                    const incomingVecKey = `${dx},${dy}`;
                    const ruleSet = CONSTANTS.REFLECTION_MAP[orientation];
                    if (!ruleSet || !ruleSet[incomingVecKey]) {
                        log.push({ msg: `ERROR: Mirror ${orientation} has no rule for ${incomingVecKey}!`, audience: "public" });
                        break;
                    }
                    const result = ruleSet[incomingVecKey];
                    if (result === 'DESTROY') {
                        log.push({ msg: `HIT ${ownerName}'s Mirror!`, audience: "public" });
                        hits.push(unit);
                        break; 
                    } else {
                        log.push({ msg: `REFLECT off ${ownerName}'s Mirror!`, audience: `p${unit.ownerIdx}` });
                        [dx, dy] = result;
                        direction = [dx, dy];
                        continue;
                    }
                }
            }
        }
        return { path, hits, log };
    }
};

// ==========================================
// 4.5 AI LOGIC
// ==========================================
const AILogic = {
    computeTurn: (gameData, botIndex) => {
        const myP = gameData.players[botIndex];
        const actions = []; 
        let turnBudget = gameData.turnBudget || 0;
        let energyPool = gameData.energyPool || 0;

        const evaluateShot = (startLoc, dir, simState) => {
            const { hits, path } = GameLogic.traceLaser(startLoc, dir, simState);
            if (hits.some(h => h.ownerIdx === botIndex && h.type === 'nexus')) return 'FATAL';
            
            const firstMirror = hits.find(h => h.type === 'mirror');
            if (firstMirror) {
                const key = `${firstMirror.location[0]},${firstMirror.location[1]}`;
                if (State.botMemory.lastHitMirror === key) return 'REPETITIVE';
            }

            if (hits.length === 0) {
                if (path.length <= 2) return 'USELESS';
                const lastPt = path[path.length - 1];
                if (lastPt[1] > startLoc[1]) return 'USELESS';
            }

            return 'OK';
        };

        // 1. SETUP PHASE
        if (!myP.nexusLocation) {
            const r = Math.floor(Math.random() * CONSTANTS.BOARD_ROWS);
            const c = Math.floor(Math.random() * 2) + 8; 
            return { isSetup: true, nexusLoc: [r, c] };
        }

        // 2. MOVEMENT DECISION
        let needsMove = State.botMemory.wasHitLastTurn;
        
        if (!needsMove) {
            const candidates = Object.values(CONSTANTS.DIRECTIONS);
            const validShots = candidates.filter(d => evaluateShot(myP.nexusLocation, d, gameData) === 'OK');
            if (validShots.length === 0) needsMove = true;
        }

        if (needsMove) {
            let moved = false;
            let attempts = 0;
            while (!moved && attempts < 15) {
                attempts++;
                const r = Math.floor(Math.random() * CONSTANTS.BOARD_ROWS);
                const c = Math.floor(Math.random() * 5) + 5; 
                
                if (r === myP.nexusLocation[0] && c === myP.nexusLocation[1]) continue;

                if (GameLogic.isValidNexusMove(myP.nexusLocation, [r, c], botIndex, gameData)) {
                    actions.push({
                        action: 'moveNexus',
                        prevLocation: myP.nexusLocation,
                        location: [r, c]
                    });
                    myP.nexusLocation = [r,c]; 
                    moved = true;
                    State.botMemory.wasHitLastTurn = false; 
                }
            }
        }

        // 3. BUILD PHASE
        let buildAttempts = 0;
        while (turnBudget > 0 && energyPool > 0 && buildAttempts < 10) {
            buildAttempts++;
            if (Math.random() > 0.5) continue; 

            const r = Math.floor(Math.random() * CONSTANTS.BOARD_ROWS);
            const c = Math.floor(Math.random() * 5) + 5; 

            const unit = GameLogic.getUnitAt(r, c, gameData);
            const isActionPlan = actions.some(a => a.location && a.location[0] === r && a.location[1] === c);
            const isNexus = myP.nexusLocation[0] === r && myP.nexusLocation[1] === c;

            if (!unit && !isActionPlan && !isNexus) {
                const type = Math.random() > 0.5 ? 'pylon' : 'mirror';
                const orientations = ['N', 'S', 'W', 'E', 'NW', 'NE', 'SW', 'SE'];
                const orient = orientations[Math.floor(Math.random() * orientations.length)];

                actions.push({
                    action: 'build',
                    type: type,
                    location: [r, c],
                    orientation: orient,
                    cost: 1 
                });
                turnBudget--;
                energyPool--;
            }
        }

        // 4. ATTACK SELECTION
        const simGame = JSON.parse(JSON.stringify(gameData));
        const simBot = simGame.players[botIndex];
        
        actions.forEach(a => {
            if (a.action === 'build') {
                simBot.buildings.push({ type: a.type, location: a.location, orientation: a.orientation, hp: 1 });
            } else if (a.action === 'moveNexus') {
                simBot.nexusLocation = a.location;
            }
        });

        const allDirs = Object.values(CONSTANTS.DIRECTIONS);
        allDirs.sort(() => Math.random() - 0.5);

        let bestDir = null;
        let firstOkDir = null;

        for (let dir of allDirs) {
            const quality = evaluateShot(simBot.nexusLocation, dir, simGame);
            if (quality === 'FATAL') continue; 
            
            if (quality === 'OK') {
                if (!firstOkDir) firstOkDir = dir;
                if (dir[1] === -1 || dir[1] === -0.5 || dir[1] === -2) { 
                      bestDir = dir;
                      break; 
                }
            }
        }
        
        const finalDir = bestDir || firstOkDir;

        return {
            isSetup: false,
            actions: actions,
            attackDir: finalDir, 
            skipAttack: !finalDir
        };
    }
};

// ==========================================
// 5. API LAYER (Firebase Interactions)
// ==========================================
const API = {
    init: async () => {
        const config = {
            apiKey: "AIzaSyBTK04oSfdM5K0w8sspYn42OQzCGFf8AMM",
            authDomain: "zero-sum-defense.firebaseapp.com",
            projectId: "zero-sum-defense",
            storageBucket: "zero-sum-defense.firebasestorage.app",
            messagingSenderId: "484724724929",
            appId: "1:484724724929:web:104009b0c91ee8559a3040"
        };
        const app = initializeApp(config);
        State.db = getFirestore(app);
        State.auth = getAuth(app);
        setLogLevel('error'); 

        onAuthStateChanged(State.auth, async (user) => {
            if (user) {
                State.currentUser = { uid: user.uid };
                DOM.userId.textContent = user.uid;
                await API.loadProfile();
            } else {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    signInWithCustomToken(State.auth, __initial_auth_token);
                } else {
                    signInAnonymously(State.auth);
                }
            }
        });
    },

    loadProfile: async () => {
        try {
            const ref = doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'users', State.currentUser.uid, 'profile', 'settings');
            const snap = await getDoc(ref);
            if (snap.exists()) {
                State.currentUser.profile = snap.data();
                DOM.userName.textContent = State.currentUser.profile.displayName;
                DOM.$('#lobby-name-input').value = State.currentUser.profile.displayName;
                
                UIManager.populateColors(DOM.lobbyColorInput);
                DOM.lobbyColorInput.value = State.currentUser.profile.preferredColor;

                UIManager.show('lobby');
                API.presence.stop();
            } else {
                UIManager.populateColors(DOM.$('#profile-color-select'));
                UIManager.show('profile');
            }
        } catch(e) { console.error(e); UIManager.toast("Profile load error"); }
    },

    saveProfile: async (name, color) => {
        const ref = doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'users', State.currentUser.uid, 'profile', 'settings');
        await setDoc(ref, { displayName: name, preferredColor: color });
        await API.loadProfile(); 
    },

    presence: {
        start: () => {
            if (State.subs.online) return; 

            const hb = () => {
                if(!State.currentUser?.profile) return;
                const ref = doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'online_users', State.currentUser.uid);
                const currentStatus = State.currentUser.status || 'Available';
                setDoc(ref, { 
                    displayName: State.currentUser.profile.displayName, 
                    lastSeen: Date.now(),
                    status: currentStatus
                }, { merge: true });
            };
            hb(); 
            State.intervals.heartbeat = setInterval(hb, 30000);

            const onlineRef = collection(State.db, 'artifacts', CONSTANTS.APP_ID, 'online_users');
            State.subs.online = onSnapshot(onlineRef, (snap) => {
                UIManager.renderOnlineList(snap);
            });

            API.presence.listenInvites();
        },

        stop: async () => {
            if (State.intervals.heartbeat) clearInterval(State.intervals.heartbeat);
            State.intervals.heartbeat = null;

            if (State.subs.online) State.subs.online();
            State.subs.online = null;

            if (State.subs.invites) State.subs.invites();
            State.subs.invites = null;

            if (State.currentUser?.uid) {
                const ref = doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'online_users', State.currentUser.uid);
                await deleteDoc(ref);
            }
        },

        setStatus: (status) => {
            if(!State.currentUser) return;
            State.currentUser.status = status;
            const ref = doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'online_users', State.currentUser.uid);
            setDoc(ref, { status: status, lastSeen: Date.now() }, { merge: true });
        },

        listenInvites: () => {
            if (State.subs.invites) return;
            const q = query(collection(State.db, 'artifacts', CONSTANTS.APP_ID, 'invites'), where("toUid", "==", State.currentUser.uid));
            State.subs.invites = onSnapshot(q, (snap) => {
                snap.docChanges().forEach(change => {
                    if(change.type === "added" && (Date.now() - change.doc.data().timestamp < 300000)) {
                        UIManager.showInvite(change.doc.data(), change.doc.id);
                    }
                });
            });
        },

        sendInvite: async (toUid, toName, gameId) => {
            const targetRef = doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'online_users', toUid);
            const targetSnap = await getDoc(targetRef);

            if (!targetSnap.exists()) {
                throw new Error("This user is no longer online.");
            }

            if (!State.game) {
                UIManager.toast("Error: Game state not found.");
                return;
            }
            const ref = collection(State.db, 'artifacts', CONSTANTS.APP_ID, 'invites');
            await addDoc(ref, {
                toUid: toUid,
                fromUid: State.currentUser.uid,
                fromName: State.currentUser.profile.displayName,
                gameId: gameId,
                lobbyName: State.game.lobbyName,
                timestamp: Date.now()
            });
            UIManager.toast(`Invite sent to ${toName}!`);
        }
    },

    lobby: {
        create: async (name, energy, color, nexusHP) => {
            const coll = collection(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games');
            
            const gameData = {
                lobbyName: name,
                status: 'waitingForOpponent',
                createdAt: Date.now(),
                maxEnergy: parseInt(energy),
                energyPool: parseInt(energy),
                nexusHP: parseInt(nexusHP) || CONSTANTS.NEXUS_HP, 
                pendingEnergyRefund: 0,
                turn: 0,
                phase: 'setup',
                lastShotVector: null,
                log: [`Lobby '${name}' created.`],
                lastUpdated: Date.now(),
                players: [{
                    userId: State.currentUser.uid,
                    displayName: State.currentUser.profile.displayName,
                    color: color,
                    nexusLocation: null,
                    nexusHP: parseInt(nexusHP) || CONSTANTS.NEXUS_HP,
                    buildings: [],
                    escrow: 0,
                    isReady: true
                }]
            };
            const ref = await addDoc(coll, gameData);
            API.game.listen(ref.id);
            return ref.id; 
        },
        createLocal: (energy, hp, diff, color) => {
            State.game = {
                isLocal: true, 
                lobbyName: "Singleplayer",
                status: 'waitingForHostStart',
                phase: 'setup',
                maxEnergy: parseInt(energy),
                energyPool: parseInt(energy),
                nexusHP: parseInt(hp),
                fowDisabled: false,
                turn: 0,
                turnBudget: 0,
                turnActions: [],
                log: ["Local Match Created."],
                players: [
                    {
                        userId: 'ME',
                        displayName: State.currentUser.profile.displayName,
                        color: color,
                        nexusLocation: null,
                        nexusHP: parseInt(hp),
                        buildings: [],
                        isReady: true 
                    },
                    {
                        userId: 'BOT',
                        displayName: `Easy AI`,
                        color: (color === 'Red' ? 'Blue' : 'Red'),
                        nexusLocation: null,
                        nexusHP: parseInt(hp),
                        buildings: [],
                        isBot: true,
                        difficulty: diff,
                        isReady: true
                    }
                ]
            };
            State.playerIndex = 0;
            State.gameId = "LOCAL_MATCH"; 
            
            UIManager.show('waitingRoom');
            UIManager.renderWaitingRoom();
        },
        join: async (gameId) => {
            const ref = doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', gameId);
            const snap = await getDoc(ref);
            if(!snap.exists()) return UIManager.toast("Game not found");
            const data = snap.data();
            
            if(data.players[0].userId === State.currentUser.uid) {
                API.game.listen(gameId); 
                return;
            }

            if (data.players.length >= 2) {
                UIManager.toast("Lobby is full.");
                return;
            }
            
            let myColor = State.currentUser.profile.preferredColor;
            if(data.players[0].color === myColor) {
                myColor = CONSTANTS.COLORS.find(c => c !== myColor) || 'Blue';
            }

            const p2 = {
                userId: State.currentUser.uid,
                displayName: State.currentUser.profile.displayName,
                color: myColor,
                nexusHP: data.nexusHP, 
                buildings: [],
                isReady: false,
                nexusLocation: null
            };
            
            await updateDoc(ref, { 
                players: [data.players[0], p2], 
                status: 'waitingForHostStart',
                lastUpdated: Date.now(),
                log: [...data.log, `${p2.displayName} joined.`]
            });
            API.game.listen(gameId);
        },
        leave: async () => {
            if(!State.gameId) return;
            const ref = doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId);

            const snap = await getDoc(ref);
            if (!snap.exists()) {
                API.game.stopListening();
                UIManager.show('lobbyList');
                return;
            }

            if(State.game.status === 'gameOver' || State.game.players.length <= 1) {
                await deleteDoc(ref);
            } else {
                const remaining = State.game.players.filter(p => p.userId !== State.currentUser.uid);
                await updateDoc(ref, { players: remaining, status: 'waitingForOpponent' });
            }
            API.game.stopListening();
            UIManager.show('lobbyList');
        },
        listenToList: () => {
            if (State.subs.lobbyList) return;

            DOM.lobbyListContainer.innerHTML = "<div class='text-gray-500 text-center mt-4'>Loading live lobbies...</div>";

            const q = query(collection(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games'), where("status", "==", "waitingForOpponent"));

            State.subs.lobbyList = onSnapshot(q, (snap) => {
                DOM.lobbyListContainer.innerHTML = "";

                let hasLobbies = false;
                snap.forEach(async (docSnapshot) => {
                    const d = docSnapshot.data();
                    const createdAt = d.createdAt || 0;
                    const age = Date.now() - createdAt;

                    if (age > 300000) { 
                        deleteDoc(docSnapshot.ref);
                        return;
                    }

                    hasLobbies = true;
                    const btn = document.createElement('div');
                    btn.className = "bg-gray-800 p-4 rounded flex justify-between items-center cursor-pointer hover:bg-gray-700 border border-indigo-500/30 animate-fade-in";
                    btn.innerHTML = `<div><div class="font-bold text-cyan-400">${d.lobbyName}</div><div class="text-xs text-gray-400">Host: ${d.players[0].displayName}</div></div><button class="bg-green-600 px-3 py-1 rounded text-white">Join</button>`;
                    btn.onclick = () => API.lobby.join(docSnapshot.id);
                    DOM.lobbyListContainer.appendChild(btn);
                });

                if (!hasLobbies) {
                    DOM.lobbyListContainer.innerHTML = "<div class='text-gray-500 text-center mt-4'>No active lobbies found. Create one!</div>";
                }
            });
        },

        stopListeningToList: () => {
            if (State.subs.lobbyList) State.subs.lobbyList();
            State.subs.lobbyList = null;
        },
    },

    game: {
        startSandbox: async (energy, nexusHP) => {
            const coll = collection(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games');
            const gameData = {
                lobbyName: "Sandbox Mode",
                status: 'inProgress',
                phase: 'setup',
                createdAt: Date.now(),
                maxEnergy: parseInt(energy),
                energyPool: parseInt(energy),
                nexusHP: parseInt(nexusHP),
                pendingEnergyRefund: 0,
                turn: 0,
                lastShotVector: null,
                turnActions: [],
                log: [`Sandbox Mode started.`],
                lastUpdated: Date.now(),
                players: [{
                    userId: State.currentUser.uid,
                    displayName: State.currentUser.profile.displayName,
                    color: State.currentUser.profile.preferredColor,
                    nexusLocation: null,
                    nexusHP: parseInt(nexusHP),
                    buildings: [],
                    isReady: true 
                }]
            };
            const ref = await addDoc(coll, gameData);
            API.game.listen(ref.id);
            return ref.id;
        },

        listen: (id) => {
            if(State.subs.game) State.subs.game();
            State.gameId = id;
            DOM.gameId.textContent = id;
            
            State.subs.game = onSnapshot(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', id), (snap) => {
                if(!snap.exists()) { 
                    API.game.stopListening(); 
                    UIManager.showModal("Lobby Closed", false); 
                    UIManager.show('lobbyList');
                    return; 
                }
                
                const newData = snap.data();
                const amIStillInGame = newData.players.some(p => p.userId === State.currentUser.uid);
                
                if (!amIStillInGame) {
                    API.game.stopListening();
                    UIManager.toast("You have left the lobby.");
                    UIManager.show('lobbyList');
                    return;
                }

                const updateAndRender = (dataToRender) => {
                    // Context Switch Detection
                    if (dataToRender.turn !== State.lastKnownTurn || dataToRender.phase !== State.lastKnownPhase) {
                        State.currentAction = null;
                        State.selectedLocation = null;
                    }
                    
                    State.lastKnownTurn = dataToRender.turn;
                    State.lastKnownPhase = dataToRender.phase;

                    State.serverState = JSON.parse(JSON.stringify(dataToRender));
                    State.game = JSON.parse(JSON.stringify(dataToRender));
                    State.playerIndex = State.game.players.findIndex(p => p.userId === State.currentUser.uid);

                    // --- AI TRIGGER LOGIC ---
                    const currentPlayer = State.game.players[State.game.turn];
                    const isHost = State.playerIndex === 0; 
                    
                    if (isHost && currentPlayer && currentPlayer.isBot && State.game.status === 'inProgress') {
                        setTimeout(() => {
                            if (State.game.turn === State.game.players.indexOf(currentPlayer)) {
                                API.game.executeBotTurn();
                            }
                        }, 1000);
                    }

                    if(State.game.status === 'inProgress' || State.game.status === 'gameOver') {
                        UIManager.show('game');
                        UIManager.renderGame();
                    } else {
                        UIManager.show('waitingRoom');
                        UIManager.renderWaitingRoom();
                    }
                };

                const needsAnimation = newData.lastLaserPath && newData.lastAttackId && 
                                      (newData.lastAttackId !== State.game?.lastAttackId);

                if (needsAnimation) {
                    const pathArray = JSON.parse(newData.lastLaserPath);
                    const shooterIndex = (newData.turn + (newData.players.length - 1)) % newData.players.length;
                    const shooterColor = newData.players[shooterIndex] ? newData.players[shooterIndex].color : 'Red';
                    const shotVector = newData.lastShotVector;
                    UIManager.animateLaser(pathArray, shooterColor, () => updateAndRender(newData), shotVector);
                } else {
                    updateAndRender(newData);
                }
            });
        },
        stopListening: () => {
            if(State.subs.game) State.subs.game();
            State.gameId = null;
            State.game = null;
            API.presence.setStatus('Available');
        },
        
        toggleReady: async () => {
            const newP = [...State.game.players];
            newP[State.playerIndex].isReady = !newP[State.playerIndex].isReady;
            await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), {
                players: newP,
                lastUpdated: Date.now()
            });
        },
        startGame: async () => {
            if (State.playerIndex !== 0) return UIManager.toast("Only the host can start the game.");
            const resetPlayers = State.game.players.map(p => ({
                userId: p.userId,
                displayName: p.displayName,
                color: p.color,
                isReady: false,
                nexusLocation: null,
                nexusStartLoc: null,
                nexusHP: State.game.nexusHP,
                buildings: []
            }));

            await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), {
                status: 'inProgress', 
                phase: 'setup', 
                turn: 0, 
                energyPool: State.game.maxEnergy,
                pendingEnergyRefund: 0,
                lastShotVector: null,
                lastLaserPath: null,
                lastAttackId: null,
                turnBudget: 0,
                turnActions: [],
                players: resetPlayers,
                lastUpdated: Date.now(),
                log: [`Game Started! State Reset.`]
            });
        },
        startLocalMatch: () => {
            State.game.status = 'inProgress';
            State.game.phase = 'setup';
            State.game.turnBudget = 0;
            State.serverState = JSON.parse(JSON.stringify(State.game)); 
            
            UIManager.show('game');
            UIManager.renderGame();
        },
        placeNexus: async (loc) => {
            State.currentAction = null;
            State.previewNexus = null;
            UIManager.renderControls(0); 

            if (State.game.isLocal) {
                const p = State.game.players[State.playerIndex];
                p.nexusLocation = loc;
                p.nexusStartLoc = loc;
                State.game.log.push("Nexus Placed.");
                
                const bot = State.game.players[1];
                if (bot && bot.isBot && !bot.nexusLocation) {
                    const botData = AILogic.computeTurn(State.game, 1);
                    bot.nexusLocation = botData.nexusLoc;
                    bot.nexusStartLoc = botData.nexusLoc;
                }

                if (p.nexusLocation && bot.nexusLocation) {
                    State.game.phase = 'buyMove';
                    State.game.energyPool = State.game.maxEnergy;
                    State.game.turnBudget = Math.min(1, State.game.maxEnergy);
                    State.game.log.push("Both Nexus placed. Phase: Buy/Move");
                    
                    State.serverState = JSON.parse(JSON.stringify(State.game));
                }
                
                UIManager.renderGame();
                return; 
            }

            const newP = JSON.parse(JSON.stringify(State.game.players));
            newP[State.playerIndex].nexusLocation = loc;
            newP[State.playerIndex].nexusStartLoc = loc;
            
            let updates = { players: newP, log: [...State.game.log, "Nexus Placed."] };
            updates.lastUpdated = Date.now();
            
            const p1 = newP[0];
            const p2 = newP[1]; 
            
            if(p1.nexusLocation && (newP.length === 1 || p2?.nexusLocation)) {
                updates.status = 'inProgress';
                updates.phase = 'buyMove';
                const newEnergyPool = State.game.maxEnergy;
                updates.energyPool = newEnergyPool;
                updates.turnBudget = Math.min(1, newEnergyPool);
                updates.turnActions = [];
                updates.log.push("All Nexus placed. Phase: Buy/Move");
            }
            await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), updates);
        },

        placeBuilding: (type, r, c, orientation = 'N') => {
            const myP = State.game.players[State.playerIndex];
            const isSandbox = State.game.players.length === 1;

            const existingActionIndex = (State.game.turnActions || []).findIndex(a => 
                a.action === 'build' && a.location[0] === r && a.location[1] === c
            );

            let refund = 0;
            if (existingActionIndex !== -1) {
                const oldAction = State.game.turnActions[existingActionIndex];
                refund = oldAction.cost;
                
                State.game.turnActions.splice(existingActionIndex, 1);
                myP.buildings = myP.buildings.filter(b => !(b.location[0] === r && b.location[1] === c));
            }

            const currentBudget = (State.game.turnBudget || 0) + refund;
            const currentEnergy = (State.game.energyPool || 0) + refund;
            
            if (!isSandbox && (currentBudget < 1 || currentEnergy < 1)) {
                return UIManager.toast("Insufficient budget or energy.");
            }

            const newBuilding = { type, location: [r,c], hp: CONSTANTS.BUILDING_HP };
            if (type === 'mirror') newBuilding.orientation = orientation;
            
            myP.buildings.push(newBuilding);

            const cost = isSandbox ? 0 : 1;
            
            State.game.turnBudget = currentBudget - cost;
            State.game.energyPool = currentEnergy - cost;
            
            if (!State.game.turnActions) State.game.turnActions = [];
            State.game.turnActions.push({ action: 'build', type, location: [r,c], cost });

            UIManager.renderGame(); 
        },

        moveNexus: (r, c) => {
            const myP = State.game.players[State.playerIndex];
            const oldLoc = myP.nexusLocation;

            myP.nexusLocation = [r, c];
            
            if (!State.game.turnActions) State.game.turnActions = [];
            State.game.turnActions.push({ action: 'moveNexus', prevLocation: oldLoc });

            UIManager.renderGame();
        },

        resetTurn: () => {
            if (!State.serverState) return;
            State.game = JSON.parse(JSON.stringify(State.serverState));
            
            State.currentAction = null;
            State.selectedLocation = null;
            
            UIManager.toast("Turn reset.");
            UIManager.renderGame();
        },

        endPhase: () => {
            State.game.phase = 'attack';
            
            State.currentAction = null;
            State.selectedLocation = null;
            
            UIManager.renderGame();
        },

        cancelAttack: () => {
            State.game.phase = 'buyMove';
            
            State.currentAction = null;
            State.selectedLocation = null;
            
            UIManager.renderGame();
        },

        commitAndEndTurn: async () => {
            State.currentAction = null;
            State.selectedLocation = null;
            State.previewNexus = null; 
            UIManager.renderGame();

            const currentG = State.game;
            const newP = currentG.players;
            const nextTurn = (currentG.turn + 1) % newP.length;
            
            const nextPlayer = newP[nextTurn];
            if(nextPlayer?.nexusLocation) nextPlayer.nexusStartLoc = nextPlayer.nexusLocation;

            const currentPool = Number(currentG.energyPool) || 0; 
            const escrowRefund = Number(nextPlayer.escrow) || 0;  
            nextPlayer.escrow = 0; 
            const newEnergyPool = currentPool + escrowRefund;

            const nextPlayerPylons = nextPlayer?.buildings ? nextPlayer.buildings.filter(b => b.type === 'pylon').length : 0;
            const isSandbox = newP.length === 1;
            const newTurnBudget = isSandbox ? 99 : Math.min(nextPlayerPylons + 1, newEnergyPool);

            const updates = {
                turn: nextTurn,
                phase: 'buyMove',
                energyPool: newEnergyPool,
                turnBudget: newTurnBudget,
                pendingEnergyRefund: 0, 
                turnActions: [], 
                lastShotVector: null,
                lastLaserPath: null,
                lastAttackId: null,
                players: newP, 
                lastUpdated: Date.now(),
                log: [...currentG.log, `${State.currentUser.profile.displayName} ended turn.`]
            };

            if (currentG.isLocal) {
                Object.assign(State.game, updates);
                State.serverState = JSON.parse(JSON.stringify(State.game));
                UIManager.renderGame();
                if (newP[nextTurn].isBot) {
                    setTimeout(() => API.game.executeBotTurn(), 1000);
                }
                return;
            }

            await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), updates);
        },

        attack: async (dx, dy) => {
            try {
                const currentG = State.game;
                const startLoc = currentG.players[State.playerIndex].nexusLocation;
                const { path, hits, log } = GameLogic.traceLaser(startLoc, [dx, dy], currentG);
                
                const newP = JSON.parse(JSON.stringify(currentG.players));
                let destroyedCount = 0;
                let gameOver = false;
                let winner = -1;

                hits.forEach(h => {
                    if (h.type === 'nexus') {
                        newP[h.ownerIdx].nexusHP--;
                        if (newP[h.ownerIdx].isBot) State.botMemory.wasHitLastTurn = true;
                        if(newP[h.ownerIdx].nexusHP <= 0) { 
                            gameOver = true; 
                            winner = (h.ownerIdx + 1) % newP.length; 
                        }
                    } else {
                        newP[h.ownerIdx].buildings = newP[h.ownerIdx].buildings.filter(b => 
                            !(b.location[0] === h.location[0] && b.location[1] === h.location[1])
                        );
                        destroyedCount++;
                    }
                });

                const shooterIdx = State.playerIndex;
                const currentEscrow = Number(newP[shooterIdx].escrow) || 0;
                newP[shooterIdx].escrow = currentEscrow + destroyedCount;

                const nextTurn = (currentG.turn + 1) % newP.length;
                const nextPlayer = newP[nextTurn];
                if(nextPlayer?.nexusLocation) nextPlayer.nexusStartLoc = nextPlayer.nexusLocation;

                const escrowRelease = Number(nextPlayer.escrow) || 0;
                nextPlayer.escrow = 0;
                
                const currentPoolAfterSpend = Number(currentG.energyPool) || 0; 
                const newEnergyPool = currentPoolAfterSpend + escrowRelease;

                const nextPlayerPylons = nextPlayer?.buildings ? nextPlayer.buildings.filter(b => b.type === 'pylon').length : 0;
                const isSandbox = newP.length === 1;
                const newTurnBudget = isSandbox ? 99 : Math.min(nextPlayerPylons + 1, newEnergyPool);

                let updates = {
                    players: newP, 
                    log: [...currentG.log, ...log],
                    lastShotVector: [dx, dy],
                    lastLaserPath: JSON.stringify(path),
                    lastAttackId: Date.now(),
                    lastUpdated: Date.now(),
                    turn: nextTurn,
                    phase: 'buyMove',
                    energyPool: newEnergyPool, 
                    turnBudget: newTurnBudget,
                    turnActions: [],
                    pendingEnergyRefund: 0 
                };
                
                if(gameOver) {
                    updates.status = 'gameOver';
                    updates.winner = winner;
                    updates.log.push("GAME OVER!");
                }

                if (currentG.isLocal) {
                    Object.assign(State.game, updates);
                    State.serverState = JSON.parse(JSON.stringify(State.game)); 
                    
                    const shooterColor = currentG.players[State.playerIndex].color;
                    UIManager.animateLaser(path, shooterColor, () => {
                        UIManager.renderGame();
                        if (!gameOver && newP[nextTurn].isBot) {
                            setTimeout(() => API.game.executeBotTurn(), 1000);
                        }
                    }, [dx, dy]);
                    return;
                }

                await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), updates);
                
            } catch (err) {
                console.error("Attack Error:", err);
                UIManager.toast("Error attacking: " + err.message);
            }
        },

        skipAttack: async () => {
            const currentG = State.game;
            const newP = JSON.parse(JSON.stringify(currentG.players));
            const nextTurn = (currentG.turn + 1) % newP.length;
            const nextPlayer = newP[nextTurn];
            if(nextPlayer?.nexusLocation) nextPlayer.nexusStartLoc = nextPlayer.nexusLocation;
            
            const escrowRelease = Number(nextPlayer.escrow) || 0;
            nextPlayer.escrow = 0;
            const newEnergyPool = (Number(currentG.energyPool) || 0) + escrowRelease;

            const nextPlayerPylons = nextPlayer?.buildings ? nextPlayer.buildings.filter(b => b.type === 'pylon').length : 0;
            const isSandbox = newP.length === 1;
            const newTurnBudget = isSandbox ? 99 : Math.min(nextPlayerPylons + 1, newEnergyPool);

            const updates = {
                turn: nextTurn,
                phase: 'buyMove',
                energyPool: newEnergyPool,
                turnBudget: newTurnBudget,
                pendingEnergyRefund: 0,
                lastShotVector: null,
                lastLaserPath: null,
                lastAttackId: null,
                turnActions: [],
                players: newP,
                lastUpdated: Date.now(),
                log: [...currentG.log, "Attack Skipped."]
            };

            if (currentG.isLocal) {
                Object.assign(State.game, updates);
                State.serverState = JSON.parse(JSON.stringify(State.game));
                State.currentAction = null;
                State.selectedLocation = null;
                UIManager.renderGame();
                if (newP[nextTurn].isBot) {
                    setTimeout(() => API.game.executeBotTurn(), 1000);
                }
                return;
            }

            await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), updates);
        },

        executeBotTurn: async () => {
            const g = State.game;
            const botIdx = g.turn;
            const botData = AILogic.computeTurn(g, botIdx);
            
            if (g.phase === 'setup') {
                return;
            }

            const simGame = JSON.parse(JSON.stringify(g));
            const botP = simGame.players[botIdx];
            
            let spend = 0;

            botData.actions.forEach(act => {
                if (act.action === 'build') {
                    botP.buildings.push({ 
                        type: act.type, 
                        location: act.location, 
                        orientation: act.orientation,
                        hp: CONSTANTS.BUILDING_HP 
                    });
                    spend += (Number(act.cost) || 0);
                } 
                else if (act.action === 'moveNexus') {
                    botP.nexusLocation = act.location;
                    botP.nexusStartLoc = act.location;
                }
            });

            let path = null;
            let destroyedCount = 0;
            let gameOver = false;
            let winner = -1;
            let attackDir = null;

            if (botData.skipAttack) {
            } else {
                attackDir = botData.attackDir;
                const startLoc = botP.nexusLocation;
                const trace = GameLogic.traceLaser(startLoc, attackDir, simGame);
                path = trace.path;
                
                const mirrorHit = trace.hits.find(h => h.type === 'mirror');
                if (mirrorHit) {
                    State.botMemory.lastHitMirror = `${mirrorHit.location[0]},${mirrorHit.location[1]}`;
                } else {
                    State.botMemory.lastHitMirror = null;
                }

                trace.hits.forEach(h => {
                    if (h.type === 'nexus') {
                        simGame.players[h.ownerIdx].nexusHP--;
                        if(simGame.players[h.ownerIdx].nexusHP <= 0) { 
                            gameOver = true; 
                            winner = (h.ownerIdx + 1) % simGame.players.length; 
                        }
                    } else {
                        simGame.players[h.ownerIdx].buildings = simGame.players[h.ownerIdx].buildings.filter(b => 
                            !(b.location[0] === h.location[0] && b.location[1] === h.location[1])
                        );
                        destroyedCount++;
                    }
                });
            }

            const currentBotEscrow = Number(botP.escrow) || 0;
            botP.escrow = currentBotEscrow + destroyedCount;

            const nextTurn = (g.turn + 1) % g.players.length;
            const nextPlayer = simGame.players[nextTurn];
            if(nextPlayer?.nexusLocation) nextPlayer.nexusStartLoc = nextPlayer.nexusLocation;

            const escrowRelease = Number(nextPlayer.escrow) || 0;
            nextPlayer.escrow = 0;
            
            const startPool = Number(g.energyPool) || 0;
            const currentPoolAfterSpend = startPool - spend;
            const newEnergyPool = currentPoolAfterSpend + escrowRelease;

            const nextPlayerPylons = nextPlayer?.buildings ? nextPlayer.buildings.filter(b => b.type === 'pylon').length : 0;
            const newTurnBudget = Math.min(nextPlayerPylons + 1, newEnergyPool); 

            let updates = {
                players: simGame.players,
                log: [...g.log, botData.skipAttack ? "Bot skipped attack." : "Bot acts..."],
                lastShotVector: attackDir,
                lastLaserPath: path ? JSON.stringify(path) : null,
                lastAttackId: Date.now(),
                lastUpdated: Date.now(),
                turn: nextTurn,
                phase: 'buyMove',
                energyPool: newEnergyPool,
                turnBudget: newTurnBudget,
                turnActions: [],
                pendingEnergyRefund: 0 
            };

            if(gameOver) {
                updates.status = 'gameOver';
                updates.winner = winner;
                updates.log.push("GAME OVER!");
            }

            if (g.isLocal) {
                Object.assign(State.game, updates);
                State.serverState = JSON.parse(JSON.stringify(State.game));
                
                if (!botData.skipAttack && path) {
                    const botColor = g.players[botIdx].color;
                    UIManager.animateLaser(path, botColor, () => {
                        UIManager.renderGame();
                    }, attackDir);
                } else {
                    UIManager.renderGame();
                }
                return;
            }

            await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), updates);
        },

        updateSettings: async (newName, newEnergy, newNexusHP, newDifficulty) => {
            if (State.playerIndex !== 0) return; 

            const newP = JSON.parse(JSON.stringify(State.game.players));
            let newLogs = [...State.game.log];

            if (newP[1] && newP[1].isBot) {
                newP[1].difficulty = newDifficulty;
                newP[1].displayName = `Bot (${newDifficulty})`;
                newLogs.push(`Host changed difficulty to ${newDifficulty}.`);
            } else if (newP[1]) {
                newP[1].isReady = false; 
                newLogs.push("Host changed settings. Guest un-readied.");
            } else {
                newLogs.push("Host changed settings.");
            }

            await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), {
                lobbyName: newName,
                maxEnergy: parseInt(newEnergy),
                energyPool: parseInt(newEnergy), 
                nexusHP: parseInt(newNexusHP),
                players: newP,
                lastUpdated: Date.now(),
                log: newLogs
            });
        },
        kickGuest: async () => {
            if (State.playerIndex !== 0 || State.game.players.length < 2) return; 
            const hostPlayer = State.game.players[0];
            hostPlayer.isReady = false; 
            await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), {
                players: [hostPlayer], 
                status: 'waitingForOpponent',
                lastUpdated: Date.now(),
                log: [...State.game.log, `${State.game.players[1].displayName} was kicked by the host.`]
            });
        }
    }
};

// ==========================================
// 6. UI MANAGER (Rendering)
// ==========================================
const UIManager = {
    getEdgeCoords: (dr, dc) => {
        if (dr === 0 && dc === 1) return ["0%", "50%"]; // from W
        if (dr === 0 && dc === -1) return ["100%", "50%"]; // from E
        if (dr === 1 && dc === 0) return ["50%", "0%"]; // from N
        if (dr === -1 && dc === 0) return ["50%", "100%"]; // from S
        if (dr === 1 && dc === 1) return ["0%", "0%"]; // from NW
        if (dr === 1 && dc === -1) return ["100%", "0%"]; // from NE
        if (dr === -1 && dc === 1) return ["0%", "100%"]; // from SW
        if (dr === -1 && dc === -1) return ["100%", "100%"]; // from SE
        return ["50%", "50%"]; // Center/Fallback
    },
    show: (viewName) => {
        Object.values(DOM.views).forEach(v => v.classList.add('hidden'));
        if(DOM.views[viewName]) DOM.views[viewName].classList.remove('hidden');
        
        if(viewName === 'lobbyList' || viewName === 'singleplayer') API.presence.setStatus('Available');
        else if (viewName === 'game' || viewName === 'waitingRoom') API.presence.setStatus('Busy');
    },
    toast: (msg) => {
        const el = document.createElement('div');
        el.className = 'absolute top-5 right-5 bg-indigo-600 text-white p-3 rounded shadow-lg z-50';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    },
    showError: (msg) => {
        const el = document.createElement('div');
        el.className = 'absolute top-5 right-5 bg-red-600 text-white p-3 rounded shadow-lg z-50';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    },
    showModal: (msg, isEndGame) => {
        DOM.modalMsg.innerHTML = `<p>${msg}</p>`;
        DOM.$$('.modal-dynamic-btn').forEach(btn => btn.remove());
        
        DOM.$('#new-game-btn').classList.toggle('hidden', !isEndGame);
        DOM.views.modal.classList.remove('hidden');
    },
    populateColors: (select) => {
        const val = select.value; 
        select.innerHTML = '';
        CONSTANTS.COLORS.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c; opt.textContent = c;
            select.appendChild(opt);
        });
        select.value = val; 
    },
    renderOnlineList: (snap) => {
        DOM.onlineLists.forEach(list => list.innerHTML = '');
        snap.forEach(doc => {
            const d = doc.data();
            if (Date.now() - d.lastSeen > 120000 || doc.id === State.currentUser.uid) return;
            
            const isBusy = d.status === 'Busy';
            const statusText = isBusy ? "In Game" : "Available";
            const statusColor = isBusy ? "text-red-400" : "text-green-400";

            const el = document.createElement('div');
            el.className = 'flex justify-between items-center p-2 bg-gray-800 rounded mb-1';
            el.innerHTML = `
                <div>
                    <span>${d.displayName}</span>
                    <span class="ml-2 text-xs ${statusColor}">(${statusText})</span>
                </div>
                <button 
                    data-uid="${doc.id}" 
                    data-name="${d.displayName}"
                    class="invite-btn bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:opacity-50 text-white text-xs px-2 py-1 rounded"
                    ${isBusy ? 'disabled' : ''}
                >
                    Invite
                </button>
            `;
            DOM.onlineLists.forEach(list => list.appendChild(el.cloneNode(true)));
        });
    },
    showInvite: (data, id) => {
        DOM.modalMsg.innerHTML = `
            <p class="text-2xl mb-2">Game Invite!</p>
            <p class="text-lg mb-1">From: <span class="font-bold text-cyan-400">${data.fromName}</span></p>
            <p class="text-sm mb-4">Lobby: <span class="font-bold text-gray-300">${data.lobbyName}</span></p>
        `;
        
        const btnContainer = document.createElement('div');
        btnContainer.className = "flex gap-4 justify-center mt-6 modal-dynamic-btn";

        const acceptBtn = document.createElement('button');
        acceptBtn.className = "bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg";
        acceptBtn.textContent = "Accept";
        acceptBtn.onclick = () => { 
            deleteDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'invites', id));
            API.lobby.join(data.gameId);
            DOM.views.modal.classList.add('hidden');
        };

        const declineBtn = document.createElement('button');
        declineBtn.className = "bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg";
        declineBtn.textContent = "Decline";
        declineBtn.onclick = () => { 
            deleteDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'invites', id));
            DOM.views.modal.classList.add('hidden');
        };
        
        btnContainer.appendChild(declineBtn);
        btnContainer.appendChild(acceptBtn);
        DOM.modalMsg.appendChild(btnContainer);

        DOM.$('#new-game-btn').classList.add('hidden'); 
        DOM.views.modal.classList.remove('hidden');
    },
    
    renderWaitingRoom: () => {
        const g = State.game;
        const p1 = g.players[0];
        const p2 = g.players[1]; 
        const isHost = State.playerIndex === 0;
        const isBotGame = p2 && p2.isBot;
        const isLocal = g.isLocal;

        // === 1. Layout & Visibility Adjustments ===
        
        const sidebar = DOM.$('#waiting-room-view > div:last-child'); 
        if (sidebar) sidebar.classList.toggle('hidden', isBotGame || isLocal);
        const lobbyNameContainer = DOM.$('#lobby-name-container');
        if (lobbyNameContainer) lobbyNameContainer.classList.toggle('hidden', isBotGame || isLocal);
        
        const aiDiffContainer = DOM.$('#ai-difficulty-container');
        const fowContainer = DOM.$('#ai-fow-container'); 
        
        if (isBotGame) {
            aiDiffContainer.classList.remove('hidden');
            fowContainer.classList.remove('hidden');
        } else {
            aiDiffContainer.classList.add('hidden');
            fowContainer.classList.add('hidden');
        }

        // === 2. Settings Panel ===
        const hostPanel = DOM.$('#host-settings-panel');
        const lobbyNameInput = DOM.$('#waiting-lobby-name-input');
        const energySelect = DOM.$('#waiting-energy-pool-select');
        const nexusHpSelect = DOM.waitingNexusHpSelect; 
        const aiDiffSelect = DOM.$('#waiting-ai-difficulty-select'); 
        const fowCheckbox = DOM.$('#waiting-fow-checkbox'); 

        hostPanel.classList.remove('hidden');
        
        lobbyNameInput.value = g.lobbyName;
        energySelect.value = g.maxEnergy;
        nexusHpSelect.value = g.nexusHP;
        if(isBotGame) aiDiffSelect.value = g.players[1].difficulty || 'Easy';
        fowCheckbox.checked = g.fowDisabled || false;
        
        lobbyNameInput.disabled = !isHost || isBotGame || isLocal;
        energySelect.disabled = !isHost;
        nexusHpSelect.disabled = !isHost;
        aiDiffSelect.disabled = !isHost;
        fowCheckbox.disabled = !isHost;

        if (isHost) {
            const updateSettings = () => {
                if (isLocal) {
                    g.maxEnergy = parseInt(energySelect.value);
                    g.energyPool = parseInt(energySelect.value);
                    g.nexusHP = parseInt(nexusHpSelect.value);
                    g.fowDisabled = fowCheckbox.checked;
                    if (p2) {
                        p2.difficulty = aiDiffSelect.value;
                        p2.nexusHP = g.nexusHP;
                        p1.nexusHP = g.nexusHP;
                    }
                    UIManager.renderWaitingRoom();
                } else {
                    API.game.updateSettings(lobbyNameInput.value, energySelect.value, nexusHpSelect.value, aiDiffSelect.value);
                }
            };
            lobbyNameInput.onchange = updateSettings;
            energySelect.onchange = updateSettings;
            nexusHpSelect.onchange = updateSettings;
            aiDiffSelect.onchange = updateSettings;
            fowCheckbox.onchange = updateSettings;
        } else {
            lobbyNameInput.disabled = true;
            energySelect.disabled = true;
            nexusHpSelect.disabled = true;
            aiDiffSelect.disabled = true;
            fowCheckbox.disabled = true;
        }

        // === 3. Player Boxes ===
        DOM.$('#waiting-lobby-name').textContent = g.lobbyName;

        const renderBox = (p, prefix, index) => {
            const nameEl = DOM.$(`#${prefix}-name`);
            const rInd = DOM.$(`#${prefix}-ready-indicator`);
            const sel = DOM.$(`#${prefix}-color-select`);
            const kickBtn = DOM.$('#kick-p2-btn');

            rInd.classList.add('hidden');
            sel.classList.add('hidden');
            kickBtn.classList.add('hidden');

            if(!p) {
                nameEl.textContent = "Empty"; 
                nameEl.classList.add('text-gray-500');
                return;
            }

            const isMe = index === State.playerIndex;
            const isMyBot = isHost && p.isBot; 

            nameEl.textContent = p.displayName + (isMe ? " (You)" : "");
            nameEl.classList.remove('text-gray-500');
            
            sel.classList.remove('hidden');
            if (sel.options.length === 0) UIManager.populateColors(sel);
            sel.value = p.color;
            sel.disabled = !(isMe || isMyBot); 

            if(isMe || isMyBot) {
                sel.onchange = async (e) => {
                    const newP = [...State.game.players];
                    const otherPlayer = newP[(index + 1) % 2];
                    if (otherPlayer && otherPlayer.color === e.target.value) {
                        UIManager.toast("Color is already taken!");
                        e.target.value = p.color; 
                        return;
                    }
                    newP[index].color = e.target.value;
                    if (isLocal) UIManager.renderWaitingRoom();
                    else await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), { players: newP });
                };
            }

            if (!isBotGame && !isLocal) {
                rInd.classList.remove('hidden');
                if (prefix === 'p1') {
                    rInd.textContent = "HOST";
                    rInd.className = "mt-2 text-xs font-bold text-cyan-500 uppercase tracking-widest";
                } else {
                    rInd.textContent = p.isReady ? "READY" : "NOT READY";
                    rInd.className = p.isReady ? "mt-2 text-xs font-bold text-green-500 uppercase tracking-widest" : "mt-2 text-xs font-bold text-red-500 uppercase tracking-widest";
                    if (isHost) {
                        kickBtn.classList.remove('hidden');
                        kickBtn.onclick = API.game.kickGuest;
                    }
                }
            }
        };
        
        renderBox(p1, 'p1', 0);
        renderBox(p2, 'p2', 1);
        
        // === 4. Main Button ===
        const mainBtn = DOM.$('#start-game-btn');
        mainBtn.classList.remove('hidden');
        
        if (isHost) {
            if (isBotGame || isLocal) {
                mainBtn.textContent = "Start Match";
                mainBtn.disabled = false;
                mainBtn.className = "w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg text-lg transition-all shadow-lg mb-3 cursor-pointer";
                mainBtn.onclick = isLocal ? API.game.startLocalMatch : API.game.startGame;
            } else {
                const p2Ready = p2 && p2.isReady;
                mainBtn.textContent = p2Ready ? "Start Game" : (p2 ? "Waiting for Guest..." : "Waiting for Player...");
                mainBtn.disabled = !p2Ready;
                mainBtn.className = `w-full font-bold py-3 px-4 rounded-lg text-lg transition-all shadow-lg mb-3 ${p2Ready ? 'bg-green-600 hover:bg-green-500 text-white cursor-pointer' : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-75'}`;
                mainBtn.onclick = API.game.startGame;
            }
        } else if (State.playerIndex === 1) { 
            const amIReady = g.players[State.playerIndex].isReady;
            mainBtn.textContent = amIReady ? "Cancel Ready" : "Ready Up";
            mainBtn.disabled = false;
            mainBtn.onclick = API.game.toggleReady; 
            mainBtn.className = `w-full font-bold py-3 px-4 rounded-lg text-lg transition-all shadow-lg mb-3 cursor-pointer ${amIReady ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'}`;
        } else {
            mainBtn.classList.add('hidden');
        }
    },
    
    renderGame: () => {
        const g = State.game;
        const myP = g.players[State.playerIndex];
        if(!myP) return; 
        
        const getTextColor = (colorName) => {
            const c = CONSTANTS.COLOR_MAP[colorName];
            return (c && c.text) ? c.text : 'text-white';
        };

        const opponentP = g.players.length > 1 ? g.players[(State.playerIndex + 1) % 2] : null;
        const isMyTurn = g.turn === State.playerIndex;

        const myColorClass = getTextColor(myP.color);
        DOM.playerHudInfo.innerHTML = `<span class="${myColorClass}">${myP.displayName} (HP: ${myP.nexusHP})</span>`;

        if(opponentP) {
            const oppColorClass = getTextColor(opponentP.color);
            DOM.opponentHudInfo.innerHTML = `<span class="${oppColorClass}">${opponentP.displayName} (HP: ${opponentP.nexusHP})</span>`;
        } else {
            DOM.opponentHudInfo.innerHTML = `<span class="text-gray-500">Sandbox Mode</span>`;
        }
        
        if(isMyTurn) {
            DOM.playerHudLabel.textContent = "Current Turn";
            DOM.playerHudLabel.className = "text-xs text-yellow-300 animate-pulse block";
            DOM.opponentHudLabel.textContent = opponentP ? "Opponent" : "---";
            DOM.opponentHudLabel.className = "text-xs text-gray-400 block";
            DOM.phase.textContent = g.phase === 'buyMove' ? 'Planning' : 'Targeting';
        } else {
            DOM.playerHudLabel.textContent = "You Are";
            DOM.playerHudLabel.className = "text-xs text-gray-400 block";
            DOM.opponentHudLabel.textContent = opponentP ? "Current Turn" : "---";
            DOM.opponentHudLabel.className = opponentP ? "text-xs text-yellow-300 animate-pulse block" : "text-xs text-gray-400 block";
            DOM.phase.textContent = "Opponent's Turn";
        }

        const isSandbox = g.players.length === 1;
        let availableBudget;

        if (isSandbox) {
            DOM.energy.textContent = "∞";
            DOM.budget.textContent = "∞";
            availableBudget = Infinity; 
        } else {
            DOM.energy.textContent = g.energyPool;
            const budget = (g.turn === State.playerIndex && g.phase === 'buyMove') ? (g.turnBudget || 0) : 0;
            availableBudget = budget; 
            DOM.budget.textContent = availableBudget;
        }
        
        UIManager.renderBoard(); 
        UIManager.renderControls(availableBudget);
        
        if(DOM.gameLog && g.log) {
            const myAudience = `p${State.playerIndex}`;
            const filteredLog = g.log.slice().reverse().map(logEntry => {
                if (typeof logEntry === 'string') {
                    return `<div class="border-b border-gray-700 py-1">${logEntry}</div>`;
                }
                const audience = logEntry.audience;
                if (audience === 'public' || audience === myAudience) {
                    return `<div class="border-b border-gray-700 py-1">${logEntry.msg}</div>`;
                }
                return null;
            }).filter(Boolean);
            DOM.gameLog.innerHTML = filteredLog.join('');
        }
        if(g.status === 'gameOver') UIManager.showModal(`Game Over! Winner: ${g.players[g.winner].displayName}`, true);
    },
    
    renderBoard: () => {
        const g = State.game;
        if (!g || !g.players) return; 

        DOM.gameBoard.innerHTML = '';
        
        let myZoneStart, myZoneEnd;
        if (g.players.length > 1) {
            myZoneStart = State.playerIndex === 0 ? 0 : 5;
            myZoneEnd = State.playerIndex === 0 ? 5 : 10;
        } else {
            myZoneStart = 0;
            myZoneEnd = 10;
        }

        const laserPath = g.lastLaserPath ? JSON.parse(g.lastLaserPath) : null;
        const laserVector = g.lastShotVector;

        for(let r=0; r<CONSTANTS.BOARD_ROWS; r++){
            for(let c=0; c<CONSTANTS.BOARD_COLS; c++){
                const cell = document.createElement('div');
                cell.className = 'relative aspect-square border border-indigo-500/30 transition-all duration-150';
                cell.dataset.r = r; cell.dataset.c = c;

                const isMyZone = c >= myZoneStart && c < myZoneEnd;
                if(isMyZone) cell.classList.add(CONSTANTS.COLOR_MAP[g.players[State.playerIndex].color].bg);
                else cell.classList.add('bg-gray-800/50'); 

                // --- 1. RENDER SCORCHED TRAIL ---
                let scorchSVG = '';
                const isScorchVisible = isMyZone || (g.fowDisabled && g.isLocal);

                if (laserPath && isScorchVisible) {
                    laserPath.forEach((loc, i) => {
                        if (loc[0] === r && loc[1] === c) {
                            const prev = laserPath[i-1];
                            const next = laserPath[i+1];
                            let lines = [];

                            if (i === 0 && next) {
                                let dr_out, dc_out;
                                if (laserVector) {
                                    [dr_out, dc_out] = laserVector;
                                } else {
                                    dr_out = next[0] - r; dc_out = next[1] - c;
                                }
                                const [x_out, y_out] = UIManager.getEdgeCoords(dr_out * -1, dc_out * -1);
                                lines.push(`<line x1="50%" y1="50%" x2="${x_out}" y2="${y_out}" />`);
                            } else if (prev) {
                                const dr_in = r - prev[0];
                                const dc_in = c - prev[1];
                                const dr_out = next ? (next[0] - r) : 0;
                                const dc_out = next ? (next[1] - c) : 0;

                                const isWallReflect_In = (dr_in !== 0 && dc_in !== 0) && (dr_out === 0 && dc_out !== 0);
                                const isWallReflect_Out = (dr_in === 0 && dc_in !== 0) && (dr_out !== 0 && dc_out !== 0);
                                const isReflection = next && (dr_in !== dr_out || dc_in !== dc_out) && !isWallReflect_In && !isWallReflect_Out;
                                const isPassthrough = next && !isReflection && !isWallReflect_In && !isWallReflect_Out;
                                const isHit = !next;

                                const [x_in, y_in] = UIManager.getEdgeCoords(dr_in, dc_in);

                                if (isWallReflect_In) {
                                    const [x_out, y_out] = UIManager.getEdgeCoords(dr_in * -1, dc_in * -1);
                                    lines.push(`<line x1="${x_in}" y1="${y_in}" x2="${x_out}" y2="${y_out}" />`);
                                } else if (isWallReflect_Out) {
                                    const [x_out, y_out] = UIManager.getEdgeCoords(dr_out * -1, dc_out * -1);
                                    const [x_in_new, y_in_new] = UIManager.getEdgeCoords(dr_out, dc_out);
                                    lines.push(`<line x1="${x_in_new}" y1="${y_in_new}" x2="${x_out}" y2="${y_out}" />`);
                                } else if (isPassthrough || isHit) {
                                    const endPt = isPassthrough ? UIManager.getEdgeCoords(dr_out * -1, dc_out * -1) : ["50%", "50%"];
                                    lines.push(`<line x1="${x_in}" y1="${y_in}" x2="${endPt[0]}" y2="${endPt[1]}" />`);
                                } else if (isReflection) {
                                    const [x_out, y_out] = UIManager.getEdgeCoords(dr_out * -1, dc_out * -1);
                                    lines.push(`<line x1="${x_in}" y1="${y_in}" x2="50%" y2="50%" />`);
                                    lines.push(`<line x1="50%" y1="50%" x2="${x_out}" y2="${y_out}" />`);
                                }
                            }
                            
                            lines.forEach(l => scorchSVG += l);
                        }
                    });
                }
                
                const scorchLayer = scorchSVG ? `<div class="absolute inset-0 z-0 pointer-events-none"><svg width="100%" height="100%" stroke="black" stroke-width="8" stroke-opacity="0.4" stroke-linecap="round">${scorchSVG}</svg></div>` : '';

                // --- 2. RENDER UNITS ---
                let unit = GameLogic.getUnitAt(r, c, g);
                let unitToRender = unit;
                let isPreview = false;

                if (!unit && State.currentAction === 'setup' && State.previewNexus) {
                    if (State.previewNexus[0] === r && State.previewNexus[1] === c) {
                        unitToRender = { type: 'nexus', ownerIdx: State.playerIndex, hp: g.players[State.playerIndex].nexusHP };
                        isPreview = true;
                    }
                }

                let unitLayer = '';
                if(unitToRender) {
                    const isMyUnit = unitToRender.ownerIdx === State.playerIndex;
                    const isOpponentUnit = g.players.length > 1 && !isMyUnit;

                    let showUnit = isMyUnit || isMyZone || (g.fowDisabled && g.isLocal);
                    if (g.players.length > 1 && isOpponentUnit && !isMyZone && !g.fowDisabled) {
                        showUnit = false;
                    }
                    
                    if(showUnit) { 
                        const color = CONSTANTS.COLOR_MAP[g.players[unitToRender.ownerIdx].color];
                        let svg;
                        if (unitToRender.type === 'nexus') {
                            svg = CONSTANTS.SVGS.NEXUS;
                        } else if (unitToRender.type === 'pylon') {
                            svg = CONSTANTS.SVGS.PYLON;
                        } else if (unitToRender.type === 'mirror') {
                            const orientation = unitToRender.orientation || 'N';
                            const shape = CONSTANTS.SVGS.MIRROR_SHAPES[orientation];
                            svg = `<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`;
                        }

                        const maxHp = unitToRender.type === 'nexus' ? g.nexusHP : CONSTANTS.BUILDING_HP;
                        const hpDisplay = (isPreview) ? `<div class="absolute bottom-0 right-0 text-[10px] bg-black/80 px-1 text-blue-300">PREVIEW</div>` : `<div class="absolute bottom-0 right-0 text-[10px] bg-black/80 px-1 text-white">${unitToRender.hp}/${maxHp}</div>`;
                        const previewClass = (isPreview) ? 'opacity-75' : '';
                        
                        unitLayer = `<div class="absolute inset-0 p-1 z-10 ${color.stroke} ${color.bg} ${previewClass}">${svg}</div>${hpDisplay}`;
                    }
                }

                cell.innerHTML = scorchLayer + unitLayer;

                // --- 3. HIGHLIGHTS ---
                if(State.currentAction === 'move-nexus-target') {
                    const isBlocked = GameLogic.getUnitAt(r, c, g); 
                    if(!isBlocked && GameLogic.isValidNexusMove(State.selectedLocation, [r,c], State.playerIndex, g)) {
                        cell.classList.add('cursor-pointer', 'bg-yellow-500/30', 'animate-pulse');
                    }
                }

                const isEmpty = !unit && !unitToRender;
                if (isMyZone && isEmpty) {
                    if(State.currentAction === 'setup') cell.classList.add('cursor-pointer', 'hover:bg-white/20');
                    if(State.currentAction === 'place-pylon') cell.classList.add('cursor-pointer', 'hover:bg-cyan-500/50');
                    if(State.currentAction === 'place-mirror') cell.classList.add('cursor-pointer', 'hover:bg-purple-500/50');
                }

                cell.onclick = () => Handlers.boardClick(r, c);
                DOM.gameBoard.appendChild(cell);
            }
        }
    },

    renderControls: (availableBudget) => {
        const g = State.game;
        const isMyTurn = g.turn === State.playerIndex;
        const controls = { 
            setup: DOM.$('#setup-controls'), 
            buy: DOM.$('#buy-move-controls'), 
            attack: DOM.$('#attack-controls'), 
            waiting: DOM.$('#waiting-controls') 
        };
        
        Object.values(controls).forEach(el => {
            if(el) el.classList.add('hidden');
        });

        // Dynamic Title Logic
        const titleEl = DOM.$('#control-panel h3'); 
        if (titleEl) {
            if (State.currentAction === 'place-pylon') titleEl.textContent = "Place Pylon";
            else if (State.currentAction === 'place-mirror') titleEl.textContent = "Place Mirror/Set Orientation";
            else if (State.currentAction === 'move-nexus-target') titleEl.textContent = "Select Nexus Destination";
            else titleEl.textContent = "CONTROLS"; 
        }

        if(g.phase === 'setup') {
            if(!g.players[State.playerIndex].nexusLocation) {
                if(controls.setup) controls.setup.classList.remove('hidden');
                State.currentAction = 'setup'; 
                
                const btn = DOM.$('#confirm-nexus-btn');
                if(btn) {
                    btn.disabled = !State.previewNexus; 
                    btn.textContent = State.previewNexus ? "Confirm Location" : "Select Cell";
                    btn.onclick = () => API.game.placeNexus(State.previewNexus); 
                }
            } else {
                if(controls.waiting) controls.waiting.classList.remove('hidden');
            }
        }
        else if (!isMyTurn) { 
            if(controls.waiting) controls.waiting.classList.remove('hidden'); 
        }
        else if (g.phase === 'buyMove') {
            if(controls.buy) controls.buy.classList.remove('hidden');
            
            const btnPylon = DOM.$('#place-pylon-btn');
            const btnMirror = DOM.$('#place-mirror-btn');
            const btnMoveNexus = DOM.$('#move-nexus-btn');
            
            if (State.currentAction === 'move-nexus-target') {
                btnMoveNexus.textContent = "Cancel Move";
                btnMoveNexus.classList.add('bg-yellow-500');
                btnMoveNexus.classList.remove('bg-yellow-600', 'hover:bg-yellow-500');
            } else {
                btnMoveNexus.textContent = "Move Nexus";
                btnMoveNexus.classList.remove('bg-yellow-500');
                btnMoveNexus.classList.add('bg-yellow-600', 'hover:bg-yellow-500');
            }

            const selectedClass = "ring-2 ring-white scale-105";
            btnPylon.classList.remove(...selectedClass.split(' '));
            btnMirror.classList.remove(...selectedClass.split(' '));
            
            if (State.currentAction === 'place-pylon') btnPylon.classList.add(...selectedClass.split(' '));
            if (State.currentAction === 'place-mirror') btnMirror.classList.add(...selectedClass.split(' '));

            const mirrorControls = DOM.$('#mirror-rotation-controls');
            
            if (State.currentAction === 'place-mirror') {
                mirrorControls.classList.remove('hidden');
            } else {
                mirrorControls.classList.add('hidden');
            }
        }
        else if (g.phase === 'attack') {
            if(controls.attack) controls.attack.classList.remove('hidden');
            let disabledDir = null;
            const myNexusLoc = State.game.players[State.playerIndex]?.nexusLocation;
            const lastPathStr = State.game.lastLaserPath;

            if (g.players.length > 1 && myNexusLoc && lastPathStr) {
                try {
                    const path = JSON.parse(lastPathStr);
                    const myR = myNexusLoc[0];
                    const myC = myNexusLoc[1];
                    const nexusIndexInPath = path.findIndex(loc => loc[0] === myR && loc[1] === myC);
                    if (nexusIndexInPath > 0) {
                        const prevCell = path[nexusIndexInPath - 1];
                        const incomingVec = [myR - prevCell[0], myC - prevCell[1]];
                        const returnVec = [incomingVec[0] * -1, incomingVec[1] * -1];
                        disabledDir = Object.keys(CONSTANTS.DIRECTIONS).find(key => {
                            const dirVec = CONSTANTS.DIRECTIONS[key];
                            return dirVec[0] === returnVec[0] && dirVec[1] === returnVec[1];
                        });
                    }
                } catch (e) {}
            }

            DOM.$$('button[data-dir]').forEach(btn => {
                if (btn.dataset.dir === disabledDir) {
                    btn.disabled = true;
                    btn.classList.add('opacity-30', 'bg-gray-700', 'cursor-not-allowed');
                    btn.classList.remove('bg-red-800', 'hover:bg-red-700');
                } else {
                    btn.disabled = false;
                    btn.classList.remove('opacity-30', 'bg-gray-700', 'cursor-not-allowed');
                    btn.classList.add('bg-red-800', 'hover:bg-red-700');
                }
            });
        }
    },
    
    animateLaser: (path, colorName, onCompleteCallback, shotVector) => {
        const hex = CONSTANTS.LASER_COLORS[colorName] || '#ff0000';

        DOM.$$('.laser-beam-svg').forEach(el => el.remove());
        DOM.$$('.laser-active').forEach(el => el.classList.remove('laser-active'));

        let myZoneStart, myZoneEnd;
        if (State.game.players.length > 1) {
            myZoneStart = State.playerIndex === 0 ? 0 : 5;
            myZoneEnd = State.playerIndex === 0 ? 5 : CONSTANTS.BOARD_COLS;
        } else {
            myZoneStart = 0;
            myZoneEnd = CONSTANTS.BOARD_COLS;
        }

        let i = 0;
        const pulseSpeed = '0.5s';
        const pulseDelayStep = 0.05;
        const interval = setInterval(() => {
            if(i >= path.length) { 
                clearInterval(interval); 

                let j = 0;
                const fadeInterval = setInterval(() => {
                    const segment = DOM.$(`[data-laser-step="${j}"]`);
                    if (segment) segment.remove();

                    j++;

                    if (j >= path.length) {
                        clearInterval(fadeInterval); 
                        if (onCompleteCallback) onCompleteCallback(); 
                    }
                }, 120);

                return;
            }

            const [r, c] = path[i];
            const prev = path[i-1];
            const next = (i + 1 < path.length) ? path[i+1] : null;

            const isMySide = (c >= myZoneStart && c < myZoneEnd);
            if (State.game.players.length === 1 || isMySide) {
                const cell = DOM.$(`[data-r="${r}"][data-c="${c}"]`);

                if(cell) { 
                    cell.style.setProperty('--laser-color', hex);
                    let svgHTML = '';
                    if (i === 0 && next) {
                        let dr_out, dc_out;
                        if (shotVector) {
                            [dr_out, dc_out] = shotVector; 
                        } else {
                            dr_out = next[0] - r;
                            dc_out = next[1] - c;
                        }
                        const [x_out, y_out] = UIManager.getEdgeCoords(dr_out * -1, dc_out * -1);
                        const delay = i * pulseDelayStep;
                        const animStyle = `animation: laser-wave-pulse ${pulseSpeed} ease-in-out infinite; animation-delay: ${delay}s;`;
                        svgHTML = `<line x1="50%" y1="50%" x2="${x_out}" y2="${y_out}" stroke="${hex}" stroke-width="15" stroke-linecap="round" style="${animStyle}" />`;
                    } else if (prev) {
                        const dr_in = r - prev[0];
                        const dc_in = c - prev[1];
                        const isHit = !next;
                        const dr_out = next ? (next[0] - r) : 0;
                        const dc_out = next ? (next[1] - c) : 0;

                        const isDiagonalIn = dr_in !== 0 && dc_in !== 0;
                        const isHorizontalOut = dr_out === 0 && dc_out !== 0;
                        const isHorizontalIn = dr_in === 0 && dc_in !== 0;
                        const isDiagonalOut = dr_out !== 0 && dc_out !== 0;

                        const isWallReflect_In = isDiagonalIn && isHorizontalOut;
                        const isWallReflect_Out = isHorizontalIn && isDiagonalOut;

                        const isReflection = next && (dr_in !== dr_out || dc_in !== dc_out) && !isWallReflect_In && !isWallReflect_Out;
                        const isPassthrough = next && !isReflection && !isWallReflect_In && !isWallReflect_Out;

                        const [x_in, y_in] = UIManager.getEdgeCoords(dr_in, dc_in);

                        if (isWallReflect_In) {
                            const [x_out, y_out] = UIManager.getEdgeCoords(dr_in * -1, dc_in * -1);
                            const delay = i * pulseDelayStep;
                            const animStyle = `animation: laser-wave-pulse ${pulseSpeed} ease-in-out infinite; animation-delay: ${delay}s;`;
                            svgHTML = `<line x1="${x_in}" y1="${y_in}" x2="${x_out}" y2="${y_out}" stroke="${hex}" stroke-width="15" stroke-linecap="round" style="${animStyle}" />`;
                        } else if (isWallReflect_Out) {
                            const [x_out, y_out] = UIManager.getEdgeCoords(dr_out * -1, dc_out * -1);
                            const [x_in_new, y_in_new] = UIManager.getEdgeCoords(dr_out, dc_out);
                            const delay = i * pulseDelayStep;
                            const animStyle = `animation: laser-wave-pulse ${pulseSpeed} ease-in-out infinite; animation-delay: ${delay}s;`;
                            svgHTML = `<line x1="${x_in_new}" y1="${y_in_new}" x2="${x_out}" y2="${y_out}" stroke="${hex}" stroke-width="15" stroke-linecap="round" style="${animStyle}" />`;
                        }
                        else if (isPassthrough) {
                            const [x_out, y_out] = UIManager.getEdgeCoords(dr_out * -1, dc_out * -1);
                            const delay = i * pulseDelayStep;
                            const animStyle = `animation: laser-wave-pulse ${pulseSpeed} ease-in-out infinite; animation-delay: ${delay}s;`;
                            svgHTML = `<line x1="${x_in}" y1="${y_in}" x2="${x_out}" y2="${y_out}" stroke="${hex}" stroke-width="15" stroke-linecap="round" style="${animStyle}" />`;
                        } else if (isReflection) {
                            const [x_out, y_out] = UIManager.getEdgeCoords(dr_out * -1, dc_out * -1);
                            const delay = i * pulseDelayStep;
                            const animStyle = `animation: laser-wave-pulse ${pulseSpeed} ease-in-out infinite; animation-delay: ${delay}s;`;
                            svgHTML = `<line x1="${x_in}" y1="${y_in}" x2="50%" y2="50%" stroke="${hex}" stroke-width="15" stroke-linecap="round" style="${animStyle}" />` +
                                      `<line x1="50%" y1="50%" x2="${x_out}" y2="${y_out}" stroke="${hex}" stroke-width="15" stroke-linecap="round" style="${animStyle}" />`;
                        } else if (isHit) {
                            const delay = i * pulseDelayStep;
                            const animStyle = `animation: laser-wave-pulse ${pulseSpeed} ease-in-out infinite; animation-delay: ${delay}s;`;
                            svgHTML = `<line x1="${x_in}" y1="${y_in}" x2="50%" y2="50%" stroke="${hex}" stroke-width="15" stroke-linecap="round" style="${animStyle}" />`;
                        }
                    }

                    const svg = document.createElement('div');
                    svg.className = 'laser-beam-svg';
                    svg.dataset.laserStep = i;
                    svg.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">${svgHTML}</svg>`;
                    cell.appendChild(svg);
                }
            }
            i++;
        }, 120);
    }
};

// ==========================================
// 7. EVENT HANDLERS
// ==========================================
const Handlers = {
    init: () => {
        DOM.$('#save-profile-btn').onclick = () => API.saveProfile(DOM.$('#profile-display-name').value, DOM.$('#profile-color-select').value);
        
        DOM.$('#multi-player-btn').onclick = () => {
            UIManager.show('lobbyList');
            API.presence.start(); 
            API.lobby.listenToList(); 
        };

        DOM.$('#single-player-btn').onclick = () => {
            UIManager.show('singleplayer');
            API.presence.stop();
            API.lobby.stopListeningToList();
        };

        DOM.$('#start-ai-btn').onclick = () => {
            const energy = DOM.spEnergySelect.value;
            const hp = DOM.spNexusHpSelect.value;
            const diff = "Easy"; 
            const color = State.currentUser.profile.preferredColor;
            
            API.lobby.createLocal(energy, hp, diff, color);
        };

        DOM.$('#singleplayer-back-btn').onclick = () => {
            UIManager.show('lobby');
        };
        DOM.$('#start-sandbox-btn').onclick = () => {
            const energy = DOM.spEnergySelect.value;
            const hp = DOM.spNexusHpSelect.value;
            API.game.startSandbox(parseInt(energy), parseInt(hp));
        };

        DOM.$('#edit-name-btn').onclick = () => {
            DOM.lobbyNameDisplay.classList.add('hidden');
            DOM.lobbyNameEdit.classList.remove('hidden');
            DOM.lobbyNameInput.value = State.currentUser.profile.displayName;
            DOM.lobbyColorInput.value = State.currentUser.profile.preferredColor; 
            DOM.lobbyNameInput.focus();
        };
        DOM.$('#cancel-name-btn').onclick = () => {
            DOM.lobbyNameDisplay.classList.remove('hidden');
            DOM.lobbyNameEdit.classList.add('hidden');
        };
        DOM.$('#save-name-btn').onclick = () => {
            const newName = DOM.lobbyNameInput.value;
            const newColor = DOM.lobbyColorInput.value; 
            if (newName && (newName !== State.currentUser.profile.displayName || newColor !== State.currentUser.profile.preferredColor)) {
                API.saveProfile(newName, newColor); 
                UIManager.toast("Profile updated!");
            }
            DOM.lobbyNameDisplay.classList.remove('hidden');
            DOM.lobbyNameEdit.classList.add('hidden');
        };

        DOM.$('#show-create-lobby-btn').onclick = async () => {
            const defaultName = `${State.currentUser.profile.displayName}'s Game`;
            const defaultEnergy = 10;
            const defaultNexusHP = 3; 
            const defaultColor = State.currentUser.profile.preferredColor;
            
            await API.lobby.create(defaultName, defaultEnergy, defaultColor, defaultNexusHP);
        };

        DOM.$('#lobby-list-view').onclick = (e) => {
            const btn = e.target.closest('.invite-btn');
            if (btn && !btn.disabled) {
                const { uid, name } = btn.dataset;
                Handlers.sendInvite(uid, name);
            }
        };
        DOM.$('#waiting-room-view').onclick = (e) => {
            const btn = e.target.closest('.invite-btn');
            if (btn && !btn.disabled) {
                const { uid, name } = btn.dataset;
                Handlers.sendInvite(uid, name);
            }
        };
        
        DOM.$('#leave-lobby-btn').onclick = API.lobby.leave;
        DOM.$('#back-to-main-menu-btn').onclick = () => {
            UIManager.show('lobby');
            API.presence.stop(); 
            API.lobby.stopListeningToList();
        };
        DOM.$('#new-game-btn').onclick = () => { 
            DOM.views.modal.classList.add('hidden'); 
            API.lobby.leave(); 
            setTimeout(() => {
                const refreshBtn = DOM.$('#refresh-lobbies-btn');
                if (refreshBtn) refreshBtn.click();
            }, 100); 
        };

        DOM.$('#place-pylon-btn').onclick = () => { 
            State.currentAction = 'place-pylon'; 
            UIManager.renderGame(); 
        };
        
        DOM.$('#place-mirror-btn').onclick = () => { 
            State.currentAction = 'place-mirror'; 
            UIManager.renderGame(); 
        };

        DOM.$('#move-nexus-btn').onclick = () => {
            if (State.currentAction === 'move-nexus-target') {
                State.currentAction = null;
                State.selectedLocation = null;
            } else {
                State.currentAction = 'move-nexus-target';
                State.selectedLocation = State.game.players[State.playerIndex].nexusLocation;
            }
            UIManager.renderGame(); 
        };

        DOM.$('#attack-btn').onclick = () => {
            API.game.endPhase();
        };

        DOM.$('#end-turn-btn').onclick = () => {
            API.game.commitAndEndTurn();
        };

        const undoBtn = DOM.$('#undo-action-btn');
        undoBtn.textContent = "Reset Turn"; 
        undoBtn.onclick = () => {
            API.game.resetTurn();
        };

        DOM.$$('.mirror-rotate-btn').forEach(btn => {
            btn.onclick = () => {
                const orientation = btn.dataset.orientation;
                State.currentMirrorOrientation = orientation;
                DOM.$('#mirror-orientation-display').textContent = orientation;
            };
        });
        
        DOM.$$('button[data-dir]').forEach(btn => {
            btn.onclick = () => {
                const dir = CONSTANTS.DIRECTIONS[btn.dataset.dir];
                API.game.attack(dir[0], dir[1]);
            };
        });
        DOM.$('#skip-attack-btn').onclick = API.game.skipAttack;
        DOM.$('#abandon-game-btn').onclick = () => {
            API.lobby.leave();
            UIManager.toast("Game abandoned.");
        };
    },
    
    sendInvite: async (toUid, toName) => {
        try {
            let gameId = State.gameId;

            if (!gameId) {
                UIManager.toast("Creating new lobby...");
                const defaultName = `${State.currentUser.profile.displayName}'s Invite Lobby`;
                gameId = await API.lobby.create(defaultName, 10, State.currentUser.profile.preferredColor, CONSTANTS.NEXUS_HP);
                if (!gameId) throw new Error("Lobby creation failed.");
            }
            
            if (!State.game) {
                await new Promise(r => setTimeout(r, 500)); 
                if (!State.game) throw new Error("Game state not ready.");
            }

            await API.presence.sendInvite(toUid, toName, gameId);

        } catch (err) {
            console.error("Invite Error:", err);
            UIManager.showError(err.message);
        }
    },

    boardClick: (r, c) => {
        const act = State.currentAction;
        
        let isMine;
        if (State.game.players.length > 1) {
            isMine = (c >= (State.playerIndex === 0 ? 0 : 5) && c < (State.playerIndex === 0 ? 5 : 10));
        } else {
            isMine = true; 
        }
        
        const realUnit = GameLogic.getUnitAt(r,c, State.game);
        const myP = State.game.players[State.playerIndex];
        const isNexus = myP.nexusLocation && myP.nexusLocation[0] === r && myP.nexusLocation[1] === c;
        
        if(act === 'setup' && isMine && !realUnit) { 
            State.previewNexus = [r,c];
            UIManager.renderBoard();
            UIManager.renderControls(0); 
            return; 
        }
        
        const isSandbox = State.game.players.length === 1;
        
        if((act === 'place-pylon' || act === 'place-mirror') && isMine) {
            const isOccupiedByOld = realUnit && (!State.game.turnActions || !State.game.turnActions.some(a => a.action === 'build' && a.location[0]===r && a.location[1]===c));
            const isNexusOccupied = isNexus;

            if (isNexusOccupied || isOccupiedByOld) {
                return; 
            }
            
            const type = act.split('-')[1];
            API.game.placeBuilding(type, r, c, State.currentMirrorOrientation);
            return; 
        }
        
        if(act === 'move-nexus-target') {
            if(GameLogic.isValidNexusMove(State.selectedLocation, [r,c], State.playerIndex, State.game)) {
                API.game.moveNexus(r, c);
                State.currentAction = null;
                State.selectedLocation = null;
            }
        }
        
        UIManager.renderGame();
    }
};

// ==========================================
// 8. INIT
// ==========================================
window.addEventListener('load', () => {
    API.init();
    Handlers.init();
});