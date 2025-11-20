import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, addDoc, updateDoc, writeBatch, query, where, getDocs, setLogLevel, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// 1. CONFIGURATION & CONSTANTS
// ==========================================
const CONSTANTS = {
    BOARD_ROWS: 8,
    BOARD_COLS: 10,
    NEXUS_HP: 3, // Default Nexus HP
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
    VECTORS: {
        'fromN': "1,0",
        'fromNE': "1,-1",
        'fromE': "0,-1",
        'fromSE': "-1,-1",
        'fromS': "-1,0",
        'fromSW': "-1,1",
        'fromW': "0,1",
        'fromNW': "1,1",
        'toN': [-1, 0],
        'toNE': [-1,1],
        'toE': [0,1],
        'toSE': [1,1],
        'toS': [1,0],
        'toSW': [1,-1],
        'toW': [0,-1],
        'toNW': [-1,-1]
    },
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
        'Red':    '#ff0000',
        'Yellow': '#eab308',
        'Blue':   '#0000ff',
        'Green':  '#00ff00',
        'Purple': '#be00ff',
        'Orange': '#ff7f00',
        'Pink':   '#ff00bf',
        'Cyan':   '#00ffff'
    },
    APP_ID: typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'
};
CONSTANTS.REFLECTION_MAP = {
    'N': {
        [CONSTANTS.VECTORS.fromNW]: CONSTANTS.VECTORS.toNE,
        [CONSTANTS.VECTORS.fromN]: CONSTANTS.VECTORS.toN,
        [CONSTANTS.VECTORS.fromNE]: CONSTANTS.VECTORS.toNW,
        [CONSTANTS.VECTORS.fromE]: "DESTROY",
        [CONSTANTS.VECTORS.fromSE]: "DESTROY",
        [CONSTANTS.VECTORS.fromS]: "DESTROY",
        [CONSTANTS.VECTORS.fromSW]: "DESTROY",
        [CONSTANTS.VECTORS.fromW]: "DESTROY"
    },
    'NE': {
        [CONSTANTS.VECTORS.fromN]: CONSTANTS.VECTORS.toE,
        [CONSTANTS.VECTORS.fromNE]: CONSTANTS.VECTORS.toNE,
        [CONSTANTS.VECTORS.fromE]: CONSTANTS.VECTORS.toN,
        [CONSTANTS.VECTORS.fromSE]: "DESTROY",
        [CONSTANTS.VECTORS.fromS]: "DESTROY",
        [CONSTANTS.VECTORS.fromSW]: "DESTROY",
        [CONSTANTS.VECTORS.fromW]: "DESTROY",
        [CONSTANTS.VECTORS.fromNW]: "DESTROY"
    },
    'E': {
        [CONSTANTS.VECTORS.fromNE]: CONSTANTS.VECTORS.toSE,
        [CONSTANTS.VECTORS.fromE]: CONSTANTS.VECTORS.toE,
        [CONSTANTS.VECTORS.fromSE]: CONSTANTS.VECTORS.toNE,
        [CONSTANTS.VECTORS.fromS]: "DESTROY",
        [CONSTANTS.VECTORS.fromSW]: "DESTROY",
        [CONSTANTS.VECTORS.fromW]: "DESTROY",
        [CONSTANTS.VECTORS.fromNW]: "DESTROY",
        [CONSTANTS.VECTORS.fromN]: "DESTROY"
    },
    'SE': {
        [CONSTANTS.VECTORS.fromE]: CONSTANTS.VECTORS.toS,
        [CONSTANTS.VECTORS.fromSE]: CONSTANTS.VECTORS.toSE,
        [CONSTANTS.VECTORS.fromS]: CONSTANTS.VECTORS.toE,
        [CONSTANTS.VECTORS.fromSW]: "DESTROY",
        [CONSTANTS.VECTORS.fromW]: "DESTROY",
        [CONSTANTS.VECTORS.fromNW]: "DESTROY",
        [CONSTANTS.VECTORS.fromN]: "DESTROY",
        [CONSTANTS.VECTORS.fromNE]: "DESTROY",
    },
    'S': {
        [CONSTANTS.VECTORS.fromSE]: CONSTANTS.VECTORS.toSW,
        [CONSTANTS.VECTORS.fromS]: CONSTANTS.VECTORS.toS,
        [CONSTANTS.VECTORS.fromSW]: CONSTANTS.VECTORS.toSE,
        [CONSTANTS.VECTORS.fromW]: "DESTROY",
        [CONSTANTS.VECTORS.fromNW]: "DESTROY",
        [CONSTANTS.VECTORS.fromN]: "DESTROY",
        [CONSTANTS.VECTORS.fromNE]: "DESTROY",
        [CONSTANTS.VECTORS.fromE]: "DESTROY"
    },
    'SW': {
        [CONSTANTS.VECTORS.fromS]: CONSTANTS.VECTORS.toW,
        [CONSTANTS.VECTORS.fromSW]: CONSTANTS.VECTORS.toSW,
        [CONSTANTS.VECTORS.fromW]: CONSTANTS.VECTORS.toS,
        [CONSTANTS.VECTORS.fromNW]: "DESTROY",
        [CONSTANTS.VECTORS.fromN]: "DESTROY",
        [CONSTANTS.VECTORS.fromNE]: "DESTROY",
        [CONSTANTS.VECTORS.fromE]: "DESTROY",
        [CONSTANTS.VECTORS.fromSE]: "DESTROY"
    },
    'W': {
        [CONSTANTS.VECTORS.fromSW]: CONSTANTS.VECTORS.toNW,
        [CONSTANTS.VECTORS.fromW]: CONSTANTS.VECTORS.toW,
        [CONSTANTS.VECTORS.fromNW]: CONSTANTS.VECTORS.toSW,
        [CONSTANTS.VECTORS.fromN]: "DESTROY",
        [CONSTANTS.VECTORS.fromNE]: "DESTROY",
        [CONSTANTS.VECTORS.fromE]: "DESTROY",
        [CONSTANTS.VECTORS.fromSE]: "DESTROY",
        [CONSTANTS.VECTORS.fromS]: "DESTROY"
    },
    'NW': {
        [CONSTANTS.VECTORS.fromW]: CONSTANTS.VECTORS.toN,
        [CONSTANTS.VECTORS.fromNW]: CONSTANTS.VECTORS.toNW,
        [CONSTANTS.VECTORS.fromN]: CONSTANTS.VECTORS.toW,
        [CONSTANTS.VECTORS.fromNE]: "DESTROY",
        [CONSTANTS.VECTORS.fromE]: "DESTROY",
        [CONSTANTS.VECTORS.fromSE]: "DESTROY",
        [CONSTANTS.VECTORS.fromS]: "DESTROY",
        [CONSTANTS.VECTORS.fromSW]: "DESTROY"
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
    game: null,
    playerIndex: -1,
    
    currentAction: null,
    selectedLocation: null,
    currentMirrorOrientation: 'N',

    previewNexus: null,
    previewNexusLocation: null,
    previewBuildings: [],
    previewCost: 0,
    
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
        singleplayer: document.querySelector('#singleplayer-view'), // New View
        waitingRoom: document.querySelector('#waiting-room-view'),
        game: document.querySelector('#game-view'),
        modal: document.querySelector('#modal-view')
    },
    
    // Inputs & Dynamic Areas
    lobbyListContainer: document.querySelector('#lobby-list-container'),
    onlineLists: document.querySelectorAll('.online-players-list'),
    gameBoard: document.querySelector('#game-board'),
    gameLog: document.querySelector('#game-log'),

    // Lobby View (for name/color editing)
    lobbyNameDisplay: document.querySelector('#lobby-user-name-display'),
    lobbyNameEdit: document.querySelector('#lobby-user-name-edit'),
    lobbyNameInput: document.querySelector('#lobby-name-input'),
    lobbyColorInput: document.querySelector('#lobby-color-input'), // New
    
    // SP View
    spEnergySelect: document.querySelector('#sp-energy-select'), // New
    spNexusHpSelect: document.querySelector('#sp-nexus-hp-select'), // New

    // Waiting Room
    waitingNexusHpSelect: document.querySelector('#waiting-nexus-hp-select'), // New

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
// 4. GAME LOGIC (Pure Functions)
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
        // Use start-of-turn location for range check
        const [rS, cS] = p.nexusStartLoc || startLoc; 
        const [rT, cT] = targetLoc;

        // For sandbox mode (1 player), zone is the whole board
        const myZoneStart = (playerIndex === 0 && gameData.players.length > 1) ? 0 : 0;
        const myZoneEnd = (playerIndex === 0 && gameData.players.length > 1) ? 5 : CONSTANTS.BOARD_COLS;
        
        // Allow movement outside zone for P1 if it's a 1-player game
        if (gameData.players.length > 1) {
            const myZoneStart = (playerIndex === 0) ? 0 : 5;
            const myZoneEnd = (playerIndex === 0) ? 5 : CONSTANTS.BOARD_COLS;
            if (cT < myZoneStart || cT >= myZoneEnd) {
                return false; // Out of player's zone
            }
        }
        
        const pathDist = GameLogic.findShortestPath([rS, cS], [rT, cT], gameData);
        if (pathDist > CONSTANTS.NEXUS_RANGE) return false;

        const unit = GameLogic.getUnitAt(rT, cT, gameData);
        // Can only move to empty space or own nexus (self)
        if (unit && unit.type !== 'nexus') return false;
        if (unit && unit.type === 'nexus' && unit.ownerIdx !== playerIndex) return false;
        
        return true;
    },

    findShortestPath: (startLoc, targetLoc, gameData) => {
        const [startR, startC] = startLoc;
        const [targetR, targetC] = targetLoc;

        let queue = [[startR, startC, 0]]; // [r, c, distance]
        let visited = new Set();
        visited.add(`${startR},${startC}`);

        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // N, S, W, E

        while (queue.length > 0) {
            const [r, c, dist] = queue.shift();

            if (r === targetR && c === targetC)
                return dist;

            if (dist >= CONSTANTS.NEXUS_RANGE)
                continue;

            for (const [dr, dc] of directions) {
                const nr = r + dr;
                const nc = c + dc;
                const key = `${nr},${nc}`;

                if (nr < 0 || nr >= CONSTANTS.BOARD_ROWS || nc < 0 || nc >= CONSTANTS.BOARD_COLS || visited.has(key))
                    continue;

                visited.add(key);

                const unit = GameLogic.getUnitAt(nr, nc, gameData);
                const isTarget = (nr === targetR && nc === targetC);

                if (unit && !isTarget)
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
        
        // Clone game state for simulation
        const simGame = JSON.parse(JSON.stringify(gameData)); 

        for (let i = 0; i < 40; i++) { // Max steps
            r += dx; c += dy;
            path.push([r, c]);

            // 1. Wall Check
            const rOut = r < 0 || r >= CONSTANTS.BOARD_ROWS;
            const cOut = c < 0 || c >= CONSTANTS.BOARD_COLS;

            // STOP if hitting Back Walls (Left/Right columns)
            if (cOut) {
                log.push({ msg: "Laser escaped the system (MISS).", audience: "public" });
                break; 
            }

            // REFLECT if hitting Side Walls (Top/Bottom rows)
            if (rOut) {
                // Check for perpendicular (dy === 0) vs. diagonal (dy !== 0) hit

                if (dy === 0) { // Perpendicular hit
                    log.push({ msg: "Laser escaped the system (MISS).", audience: "public" });
                    break; // Escape the system
                } else { // Diagonal hit
                    const [prevR, prevC] = path[path.length - 2];
                    
                    // Determine owner based on *previous* cell's column
                    let ownerIdx = -1;
                    if (gameData.players.length > 1) {
                        ownerIdx = (prevC < 5) ? 0 : 1;
                    } else {
                        ownerIdx = 0; // Sandbox mode
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

            // 2. Unit Check
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
        setLogLevel('error'); // Clean console

        onAuthStateChanged(State.auth, async (user) => {
            if (user) {
                State.currentUser = { uid: user.uid };
                DOM.userId.textContent = user.uid;
                await API.loadProfile();
                // Presence starts when user clicks "multiplayer", not on auth
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
                
                // Populate and set color in main menu editor
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

    // MODIFIED: To save color as well
    saveProfile: async (name, color) => {
        const ref = doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'users', State.currentUser.uid, 'profile', 'settings');
        await setDoc(ref, { displayName: name, preferredColor: color });
        await API.loadProfile(); // Reload profile to update State and UI
        // The presence heartbeat (hb) will automatically pick up the new name
    },

    presence: {
        start: () => {
            if (State.subs.online) return; // Already started

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
            // Store interval ID so we can stop it later
            State.intervals.heartbeat = setInterval(hb, 30000);

            const onlineRef = collection(State.db, 'artifacts', CONSTANTS.APP_ID, 'online_users');
            State.subs.online = onSnapshot(onlineRef, (snap) => {
                UIManager.renderOnlineList(snap);
            });

            API.presence.listenInvites();
        },

        stop: async () => {
            // 1. Stop Heartbeat
            if (State.intervals.heartbeat) clearInterval(State.intervals.heartbeat);
            State.intervals.heartbeat = null;

            // 2. Unsubscribe from Online List
            if (State.subs.online) State.subs.online();
            State.subs.online = null;

            // 3. Unsubscribe from Invites (User won't receive invites in main menu)
            if (State.subs.invites) State.subs.invites();
            State.subs.invites = null;

            // 4. Delete self from DB immediately (removes from other players' lists)
            if (State.currentUser?.uid) {
                const ref = doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'online_users', State.currentUser.uid);
                await deleteDoc(ref);
            }
        },

        setStatus: (status) => {
            if(!State.currentUser) return;
            State.currentUser.status = status;
            const ref = doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'online_users', State.currentUser.uid);
            // Use setDoc with merge to ensure we don't overwrite if it was deleted (though usually we are active)
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
            // SAFETY CHECK: Does the user still exist?
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
        // MODIFIED: To accept new game settings
        create: async (name, energy, color, nexusHP) => {
            const coll = collection(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games');
            
            const gameData = {
                lobbyName: name,
                status: 'waitingForOpponent',
                createdAt: Date.now(),
                maxEnergy: parseInt(energy),
                energyPool: parseInt(energy),
                nexusHP: parseInt(nexusHP) || CONSTANTS.NEXUS_HP, // New setting
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
                    nexusHP: parseInt(nexusHP) || CONSTANTS.NEXUS_HP, // New setting
                    buildings: [],
                    isReady: true
                }]
            };
            const ref = await addDoc(coll, gameData);
            API.game.listen(ref.id);
            return ref.id; // Return the new ID
        },
        join: async (gameId) => {
            const ref = doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', gameId);
            const snap = await getDoc(ref);
            if(!snap.exists()) return UIManager.toast("Game not found");
            const data = snap.data();
            
            if(data.players[0].userId === State.currentUser.uid) {
                API.game.listen(gameId); // Re-join own game
                return;
            }

            // Don't join if full
            if (data.players.length >= 2) {
                UIManager.toast("Lobby is full.");
                return;
            }
            
            // MODIFIED: Color exclusivity logic
            let myColor = State.currentUser.profile.preferredColor;
            if(data.players[0].color === myColor) {
                myColor = CONSTANTS.COLORS.find(c => c !== myColor) || 'Blue';
            }

            const p2 = {
                userId: State.currentUser.uid,
                displayName: State.currentUser.profile.displayName,
                color: myColor, // Use the determined color
                nexusHP: data.nexusHP, // Get HP from lobby settings
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

            // Check if game exists before trying to delete
            const snap = await getDoc(ref);
            if (!snap.exists()) {
                API.game.stopListening();
                UIManager.show('lobbyList');
                return;
            }

            if(State.game.status === 'gameOver' || State.game.players.length <= 1) {
                await deleteDoc(ref);
            } else {
                // Remove self
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

                    if (age > 300000) { // Cleanup old lobbies automatically
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
        // NEW: Start Sandbox Game
        startSandbox: async (energy, nexusHP) => {
            const coll = collection(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games');
            
            const gameData = {
                lobbyName: "Sandbox Mode",
                status: 'inProgress', // Start immediately
                phase: 'setup', // Go to setup
                createdAt: Date.now(),
                maxEnergy: parseInt(energy),
                energyPool: parseInt(energy),
                nexusHP: parseInt(nexusHP),
                pendingEnergyRefund: 0,
                turn: 0,
                lastShotVector: null,
                log: [`Sandbox Mode started.`],
                lastUpdated: Date.now(),
                players: [{
                    userId: State.currentUser.uid,
                    displayName: State.currentUser.profile.displayName,
                    color: State.currentUser.profile.preferredColor,
                    nexusLocation: null,
                    nexusHP: parseInt(nexusHP),
                    buildings: [],
                    isReady: true // Only player is always ready
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

                // === Local function to update state and render ===
                const updateAndRender = (dataToRender) => {
                    // Check for race condition
                    if (dataToRender.lastUpdated < State.game?.lastUpdated && State.game?.lastUpdated) { return; }

                    State.game = dataToRender; // Use the passed-in data
                    State.playerIndex = State.game.players.findIndex(p => p.userId === State.currentUser.uid);

                    if(State.game.status === 'inProgress' || State.game.status === 'gameOver') {
                        UIManager.show('game');
                        UIManager.renderGame();
                    } else {
                        UIManager.show('waitingRoom');
                        UIManager.renderWaitingRoom();
                    }
                };

                // === NEW ANIMATION TRIGGER ===
                const needsAnimation = newData.lastLaserPath && newData.lastAttackId && 
                                        (newData.lastAttackId !== State.game?.lastAttackId);

                if (needsAnimation) {
                    const pathArray = JSON.parse(newData.lastLaserPath);
                    const shooterIndex = (newData.turn + (newData.players.length - 1)) % newData.players.length;
                    const shooterColor = newData.players[shooterIndex] ? newData.players[shooterIndex].color : 'Red';
                    const shotVector = newData.lastShotVector;

                    // Play animation *first*, using the OLD state.
                    // Then, in the callback, update the state and render.
                    UIManager.animateLaser(pathArray, shooterColor, () => updateAndRender(newData), shotVector);
                } else {
                    // =============================
                    // No animation, just update immediately
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
        
        // --- Actions ---
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
            // 1. Deep Reset of Players (keep ID/Name/Color/Ready, wipe board data)
            const resetPlayers = State.game.players.map(p => ({
                userId: p.userId,
                displayName: p.displayName,
                color: p.color,
                isReady: false,
                nexusLocation: null,
                nexusStartLoc: null,
                nexusHP: State.game.nexusHP, // Use new setting from game state
                buildings: []
            }));

            // 2. Push Full Reset Update
            try {
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
                    players: resetPlayers,
                    lastUpdated: Date.now(),
                    log: [`Game Started! State Reset.`]
                });
                console.log("Game start update succeeded.");
            } catch (e) {
                console.error("FIREBASE STTART GAME ERROR:", e);
                UIManager.showError("Failed to start game. Check console/FireStore rules.");
            }
        },
        placeNexus: async (loc) => {
            const newP = JSON.parse(JSON.stringify(State.game.players));
            newP[State.playerIndex].nexusLocation = loc;
            newP[State.playerIndex].nexusStartLoc = loc;
            
            let updates = { players: newP, log: [...State.game.log, "Nexus Placed."] };
            updates.lastUpdated = Date.now();
            
            // Check if both ready
            const p1 = newP[0];
            const p2 = newP[1]; // Might be undefined in sandbox
            
            // MODIFIED: Check works for both 1-player and 2-player games
            if(p1.nexusLocation && (newP.length === 1 || p2?.nexusLocation)) {
                updates.status = 'inProgress';
                updates.phase = 'buyMove';
                const newEnergyPool = State.game.maxEnergy;
                updates.energyPool = newEnergyPool;
                // Player 0 (turn 0) has 0 pylons. Budget = min(0 + 1, energyPool)
                updates.turnBudget = Math.min(1, newEnergyPool);
                updates.log.push("All Nexus placed. Phase: Buy/Move");
            }
            await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), updates);
        },
        confirmBuyMovePhase: async (buildingsToPlace, nexusMoveLocation) => {
            const newP = JSON.parse(JSON.stringify(State.game.players));
            const myP = newP[State.playerIndex];

            let totalCost = 0;
            let newLogs = [...State.game.log];
            if (nexusMoveLocation) {
                myP.nexusLocation = nexusMoveLocation;
                newLogs.push(`Nexus moved.`);
            }

            buildingsToPlace.forEach(b => {
                const newBuilding = { type: b.type, location: b.location, hp: CONSTANTS.BUILDING_HP };
                if (b.type === 'mirror') {
                    newBuilding.orientation = b.orientation || 'N';
                    newLogs.push(`Placed ${newBuilding.orientation} Mirror.`);
                } else {
                    newLogs.push(`Placed ${b.type}.`);
                }
                myP.buildings.push(newBuilding);
                totalCost += 1; // Still count for logs, but we'll zero it out
            });

            // ADD THIS BLOCK
            const isSandbox = newP.length === 1;
            const finalCost = isSandbox ? 0 : totalCost;
            if (isSandbox && totalCost > 0) {
                newLogs.push(`Placed ${totalCost} buildings (free).`);
            }
            // END ADD

            await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), {
                players: newP,
                // MODIFY THIS LINE
                energyPool: (State.game.energyPool - finalCost) + State.game.pendingEnergyRefund,
                // MODIFY THIS LINE
                turnBudget: State.game.turnBudget - finalCost,
                phase: 'attack',
                pendingEnergyRefund: 0,
                lastUpdated: Date.now(),
                log: [...newLogs, "Attack Phase."]
            });
        },
        endPhase: async () => {
            await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), {
                phase: 'attack',
                lastUpdated: Date.now(),
                log: [...State.game.log, "Attack Phase."]
            });
        },
        attack: async (dx, dy) => {
            try {
                const startLoc = State.game.players[State.playerIndex].nexusLocation;
                const { path, hits, log } = GameLogic.traceLaser(startLoc, [dx, dy], State.game);
                
                // Apply Damage
                const newP = JSON.parse(JSON.stringify(State.game.players));
                let destroyedCount = 0;
                let gameOver = false;
                let winner = -1;

                hits.forEach(h => {
                    if (h.type === 'nexus') {
                        newP[h.ownerIdx].nexusHP--;
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

                const nextTurn = (State.game.turn + 1) % newP.length;
                // Apply refunds
                const nextPool = State.game.energyPool;

                // Calculate next player's budget
                const nextPlayer = newP[nextTurn];
                const nextPlayerPylons = nextPlayer?.buildings ? nextPlayer.buildings.filter(b => b.type === 'pylon').length : 0;
                const newTurnBudget = Math.min(nextPlayerPylons + 1, nextPool);
                
                if(nextPlayer?.nexusLocation) nextPlayer.nexusStartLoc = nextPlayer.nexusLocation;

                let updates = {
                    players: newP,
                    log: [...State.game.log, ...log],
                    lastShotVector: [dx, dy],
                    lastLaserPath: JSON.stringify(path),
                    lastAttackId: Date.now(),
                    lastUpdated: Date.now(),
                    turn: nextTurn,
                    phase: 'buyMove',
                    energyPool: nextPool,
                    turnBudget: newTurnBudget,
                    pendingEnergyRefund: destroyedCount
                };
                
                if(gameOver) {
                    updates.status = 'gameOver';
                    updates.winner = winner;
                    updates.log.push("GAME OVER!");
                }

                await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), updates);
                
            } catch (err) {
                console.error("Attack Error:", err);
                UIManager.toast("Error attacking: " + err.message);
            }
        },
        skipAttack: async () => {
            const newP = JSON.parse(JSON.stringify(State.game.players));
            const nextTurn = (State.game.turn + 1) % newP.length;
            const nextPlayer = newP[nextTurn];
            if(nextPlayer?.nexusLocation) nextPlayer.nexusStartLoc = nextPlayer.nexusLocation;
            
            const newEnergyPool = State.game.energyPool + State.game.pendingEnergyRefund;
            const nextPlayerPylons = nextPlayer?.buildings ? nextPlayer.buildings.filter(b => b.type === 'pylon').length : 0;
            const newTurnBudget = Math.min(nextPlayerPylons + 1, newEnergyPool);

            await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), {
                turn: nextTurn,
                phase: 'buyMove',
                energyPool: newEnergyPool,
                turnBudget: newTurnBudget,
                pendingEnergyRefund: 0,
                lastShotVector: null,
                lastLaserPath: null,
                lastAttackId: null,
                players: newP,
                lastUpdated: Date.now(),
                log: [...State.game.log, "Attack Skipped."]
            });
        },
        cancelAttack: async () => {
            await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), {
                phase: 'buyMove',
                lastUpdated: Date.now(),
                log: [...State.game.log, "Attack canceled."]
            });
        },
        commitAndEndTurn: async (buildingsToPlace, nexusMoveLocation) => {
            const newP = JSON.parse(JSON.stringify(State.game.players));
            const myP = newP[State.playerIndex];
            let newLogs = [...State.game.log];
            let totalCost = 0;

            // 1. Apply Previews
            if (nexusMoveLocation) {
                myP.nexusLocation = nexusMoveLocation;
                newLogs.push(`Nexus moved.`);
            }
            buildingsToPlace.forEach(b => {
                const newBuilding = { type: b.type, location: b.location, hp: CONSTANTS.BUILDING_HP };
                if (b.type === 'mirror') {
                    newBuilding.orientation = b.orientation || 'N';
                    newLogs.push(`Placed ${newBuilding.orientation} Mirror.`);
                } else {
                    newLogs.push(`Placed ${b.type}.`);
                }
                myP.buildings.push(newBuilding);
                totalCost += 1;
            });
            if (buildingsToPlace.length > 0) {
                newLogs.push(`Buildings placed. Total cost: ${totalCost}`);
            }
            newLogs.push(`${myP.displayName} skipped the attack phase.`);

            // 2. End Turn Logic (from skipAttack)
            const isSandbox = newP.length === 1;
            const finalCost = isSandbox ? 0 : totalCost;

            const nextTurn = (State.game.turn + 1) % newP.length;
            const nextPlayer = newP[nextTurn];
            if(nextPlayer?.nexusLocation) nextPlayer.nexusStartLoc = nextPlayer.nexusLocation;

            const newEnergyPool = (State.game.energyPool - finalCost) + State.game.pendingEnergyRefund;
            const nextPlayerPylons = nextPlayer?.buildings ? nextPlayer.buildings.filter(b => b.type === 'pylon').length : 0;
            const newTurnBudget = isSandbox ? 99 : Math.min(nextPlayerPylons + 1, newEnergyPool);

            await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), {
                turn: nextTurn,
                phase: 'buyMove',
                energyPool: newEnergyPool,
                turnBudget: newTurnBudget,
                pendingEnergyRefund: 0, 
                lastShotVector: null,
                lastLaserPath: null,
                lastAttackId: null,
                players: newP,
                lastUpdated: Date.now(),
                log: newLogs
            });
        },

        // MODIFIED: To accept newNexusHP
        updateSettings: async (newName, newEnergy, newNexusHP) => {
            if (State.playerIndex !== 0) return; // Host only

            const newP = JSON.parse(JSON.stringify(State.game.players));
            let newLogs = [...State.game.log];

            if (newP[1]) {
                newP[1].isReady = false; // Un-ready the guest
                newLogs.push("Host changed settings. Guest un-readied.");
            } else {
                newLogs.push("Host changed settings.");
            }

            await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), {
                lobbyName: newName,
                maxEnergy: parseInt(newEnergy),
                energyPool: parseInt(newEnergy), // Also update the pool to match
                nexusHP: parseInt(newNexusHP), // New Setting
                players: newP,
                lastUpdated: Date.now(),
                log: newLogs
            });
        },

        kickGuest: async () => {
            if (State.playerIndex !== 0 || State.game.players.length < 2) return; // Host only

            const hostPlayer = State.game.players[0];
            hostPlayer.isReady = false; // Reset host ready state

            await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), {
                players: [hostPlayer], // Set players array to only host
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
    show: (viewName) => {
        Object.values(DOM.views).forEach(v => v.classList.add('hidden'));
        if(DOM.views[viewName]) DOM.views[viewName].classList.remove('hidden');
        
        // Update presence status based on view
        if(viewName === 'lobbyList' || viewName === 'singleplayer') API.presence.setStatus('Available');
        else if (viewName === 'game' || viewName === 'waitingRoom') API.presence.setStatus('Busy');
        // Note: 'lobby' (main menu) does not set a status, presence is off
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
        // Clear old dynamic buttons
        DOM.$$('.modal-dynamic-btn').forEach(btn => btn.remove());
        
        DOM.$('#new-game-btn').classList.toggle('hidden', !isEndGame);
        DOM.views.modal.classList.remove('hidden');
    },
    populateColors: (select) => {
        const val = select.value; // Store current value
        select.innerHTML = '';
        CONSTANTS.COLORS.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c; opt.textContent = c;
            select.appendChild(opt);
        });
        select.value = val; // Restore
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
    // MODIFIED: To show more invite info
    showInvite: (data, id) => {
        DOM.modalMsg.innerHTML = `
            <p class="text-2xl mb-2">Game Invite!</p>
            <p class="text-lg mb-1">From: <span class="font-bold text-cyan-400">${data.fromName}</span></p>
            <p class="text-sm mb-4">Lobby: <span class="font-bold text-gray-300">${data.lobbyName}</span></p>
        `;
        
        // Add Accept/Decline buttons
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

        DOM.$('#new-game-btn').classList.add('hidden'); // Hide default button
        DOM.views.modal.classList.remove('hidden');
    },
    
    // MODIFIED: To include Nexus HP settings
    renderWaitingRoom: () => {
        const g = State.game;
        const p1 = g.players[0];
        const p2 = g.players[1];
        const isHost = State.playerIndex === 0;

        // === Host Settings Panel ===
        const hostPanel = DOM.$('#host-settings-panel');
        const lobbyNameInput = DOM.$('#waiting-lobby-name-input');
        const energySelect = DOM.$('#waiting-energy-pool-select');
        const nexusHpSelect = DOM.waitingNexusHpSelect; // From Cache

        if (isHost) {
            hostPanel.classList.remove('hidden');
            lobbyNameInput.disabled = false;
            energySelect.disabled = false;
            nexusHpSelect.disabled = false; // Enable HP select
            
            lobbyNameInput.value = g.lobbyName;
            energySelect.value = g.maxEnergy;
            nexusHpSelect.value = g.nexusHP; // Set HP value

            // Add event listeners that update settings and un-ready P2
            const updateSettings = () => {
                API.game.updateSettings(lobbyNameInput.value, energySelect.value, nexusHpSelect.value);
            };
            lobbyNameInput.onchange = updateSettings;
            energySelect.onchange = updateSettings;
            nexusHpSelect.onchange = updateSettings; // Add handler

        } else {
            // Guest just sees the panel, but disabled
            hostPanel.classList.remove('hidden');
            lobbyNameInput.value = g.lobbyName;
            energySelect.value = g.maxEnergy;
            nexusHpSelect.value = g.nexusHP; // Set HP value
            lobbyNameInput.disabled = true;
            energySelect.disabled = true;
            nexusHpSelect.disabled = true; // Disable HP select
        }

        DOM.$('#waiting-lobby-name').textContent = g.lobbyName;

        // Helper to render player box
        const renderBox = (p, prefix, isMe) => {
            const nameEl = DOM.$(`#${prefix}-name`);
            const rInd = DOM.$(`#${prefix}-ready-indicator`);
            const sel = DOM.$(`#${prefix}-color-select`);
            
            const kickBtn = DOM.$('#kick-p2-btn');

            if(!p) {
                nameEl.textContent = "Empty"; 
                nameEl.classList.add('text-gray-500');
                rInd.classList.add('hidden'); 
                sel.classList.add('hidden');
                if (prefix === 'p2') kickBtn.classList.add('hidden'); // Hide kick button if no P2
                return;
            }

            nameEl.textContent = p.displayName + (isMe ? " (You)" : "");
            nameEl.classList.remove('text-gray-500');
            
            if (prefix === 'p1') {
                rInd.textContent = "HOST";
                rInd.className = "mt-2 text-xs font-bold text-cyan-500 uppercase tracking-widest";
            } else {
                rInd.classList.remove('hidden');
                rInd.textContent = p.isReady ? "READY" : "NOT READY";
                rInd.className = p.isReady ? "mt-2 text-xs font-bold text-green-500 uppercase tracking-widest" : "mt-2 text-xs font-bold text-red-500 uppercase tracking-widest";

                // Show/bind kick button
                if (isHost) {
                    kickBtn.classList.remove('hidden');
                    kickBtn.onclick = API.game.kickGuest;
                } else {
                    kickBtn.classList.add('hidden');
                }
            }
            
            sel.classList.remove('hidden');
            if (sel.options.length === 0) UIManager.populateColors(sel);
            sel.value = p.color;
            sel.disabled = !isMe; // Can only change your own color
            if(isMe) {
                sel.onchange = async (e) => {
                    const newP = [...State.game.players];
                    const otherPlayer = newP[(State.playerIndex + 1) % 2];
                    
                    // Color Exclusivity Check
                    if (otherPlayer && otherPlayer.color === e.target.value) {
                        UIManager.toast("Color is already taken!");
                        e.target.value = p.color; // Revert
                        return;
                    }
                    
                    newP[State.playerIndex].color = e.target.value;
                    await updateDoc(doc(State.db, 'artifacts', CONSTANTS.APP_ID, 'public', 'data', 'zero_sum_games', State.gameId), { players: newP });
                };
            }
        };
        
        renderBox(p1, 'p1', State.playerIndex === 0);
        renderBox(p2, 'p2', State.playerIndex === 1);
        
        // Main Button Logic
        const mainBtn = DOM.$('#start-game-btn');
        
        if(isHost) {
            // Host Logic: Start Game
            const p2Ready = p2 && p2.isReady;
            mainBtn.textContent = p2Ready ? "Start Game" : (p2 ? "Waiting for Guest..." : "Waiting for Player...");
            mainBtn.disabled = !p2Ready;
            mainBtn.onclick = API.game.startGame;
            
            mainBtn.className = `w-full font-bold py-3 px-4 rounded-lg text-lg transition-all shadow-lg mb-3 ${p2Ready ? 'bg-green-600 hover:bg-green-500 text-white cursor-pointer' : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-75'}`;
        } else if (State.playerIndex === 1) { // Check if guest
            // Guest Logic: Toggle Ready
            const amIReady = g.players[State.playerIndex].isReady;
            mainBtn.textContent = amIReady ? "Cancel Ready" : "Ready Up";
            mainBtn.disabled = false;
            mainBtn.onclick = API.game.toggleReady; // Guest's job is always to toggle ready

            mainBtn.className = `w-full font-bold py-3 px-4 rounded-lg text-lg transition-all shadow-lg mb-3 cursor-pointer ${amIReady ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'}`;
        } else {
            // This handles non-host, non-guest (i.e., should not happen in 2-player, but good fallback)
            mainBtn.classList.add('hidden');
        }
    },
    
    renderGame: () => {
        if (State.game.phase !== 'buyMove' || State.game.turn !== State.playerIndex) {
            State.previewBuildings = [];
            State.previewCost = 0;
            State.previewNexusLocation = null;
            State.currentAction = null;
        }

        const g = State.game;
        const myP = g.players[State.playerIndex];
        if(!myP) return; 
        
        const turnP = g.players[g.turn];
        
        const getTextColor = (colorName) => {
            const c = CONSTANTS.COLOR_MAP[colorName];
            return (c && c.text) ? c.text : 'text-white';
        };

        const opponentP = g.players.length > 1 ? g.players[(State.playerIndex + 1) % 2] : null;
        const isMyTurn = g.turn === State.playerIndex;

        // 1. Set Your Info
        const myColorClass = getTextColor(myP.color);
        DOM.playerHudInfo.innerHTML = `<span class="${myColorClass}">${myP.displayName} (HP: ${myP.nexusHP})</span>`;

        // 2. Set Opponent Info
        if(opponentP) {
            const oppColorClass = getTextColor(opponentP.color);
            DOM.opponentHudInfo.innerHTML = `<span class="${oppColorClass}">${opponentP.displayName} (HP: ${opponentP.nexusHP})</span>`;
        } else {
            DOM.opponentHudInfo.innerHTML = `<span class="text-gray-500">Sandbox Mode</span>`;
        }
        // 3. Set Turn Indicator
        if(isMyTurn) {
            DOM.playerHudLabel.textContent = "Current Turn";
            DOM.playerHudLabel.className = "text-xs text-yellow-300 animate-pulse block";
            DOM.opponentHudLabel.textContent = opponentP ? "Opponent" : "---";
            DOM.opponentHudLabel.className = "text-xs text-gray-400 block";
        } else {
            DOM.playerHudLabel.textContent = "You Are";
            DOM.playerHudLabel.className = "text-xs text-gray-400 block";
            DOM.opponentHudLabel.textContent = opponentP ? "Current Turn" : "---";
            DOM.opponentHudLabel.className = opponentP ? "text-xs text-yellow-300 animate-pulse block" : "text-xs text-gray-400 block";
        }

        DOM.phase.textContent = g.phase;

        const isSandbox = g.players.length === 1;
        let availableBudget;

        if (isSandbox) {
            DOM.energy.textContent = "∞";
            DOM.budget.textContent = "∞";
            availableBudget = Infinity; // Pass infinity to renderControls
        } else {
            DOM.energy.textContent = g.energyPool;
            const budget = (g.turn === State.playerIndex && g.phase === 'buyMove') ? (g.turnBudget || 0) : 0;
            availableBudget = budget - State.previewCost;
            DOM.budget.textContent = availableBudget;
        }
        
        // Render sub-components
        UIManager.renderBoard(); // Will use preview state
        UIManager.renderControls(availableBudget);
        
        // Render Log
        if(DOM.gameLog && g.log) {
            const myAudience = `p${State.playerIndex}`;
            const filteredLog = g.log.slice().reverse().map(logEntry => {
                if (typeof logEntry === 'string') {
                    return `<div class="border-b border-gray-700 py-1">${logEntry}</div>`;
                }

                // Handle new log objects
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
        DOM.gameBoard.innerHTML = '';
        
        // MODIFIED: Sandbox mode has different zone rules
        let myZoneStart, myZoneEnd;
        if (g.players.length > 1) {
            myZoneStart = State.playerIndex === 0 ? 0 : 5;
            myZoneEnd = State.playerIndex === 0 ? 5 : 10;
        } else {
            // Sandbox mode, you own the whole board
            myZoneStart = 0;
            myZoneEnd = 10;
        }


        for(let r=0; r<CONSTANTS.BOARD_ROWS; r++){
            for(let c=0; c<CONSTANTS.BOARD_COLS; c++){
                const cell = document.createElement('div');
                cell.className = 'relative aspect-square border border-indigo-500/30 transition-all duration-150';
                cell.dataset.r = r; cell.dataset.c = c;

                const isMyZone = c >= myZoneStart && c < myZoneEnd;
                if(isMyZone) cell.classList.add(CONSTANTS.COLOR_MAP[g.players[State.playerIndex].color].bg);
                else cell.classList.add('bg-gray-800/50'); // Shroud style

                // --- New Render Logic (Handles Previews) ---

                let unit = GameLogic.getUnitAt(r, c, g);
                let unitToRender = unit;
                let isPreview = false;
                const previewBuilding = State.previewBuildings.find(b => b.location[0] === r && b.location[1] === c);

                // Check if we're rendering my nexus AND there's a preview move
                if (unit && unit.type === 'nexus' && unit.ownerIdx === State.playerIndex && State.previewNexusLocation) {
                    // This is the nexus at its *original* spot, but we have a preview move. Hide it.
                    unitToRender = null; 
                }

                // 1. Check for preview buildings if cell is empty
                if (!unit) {
                    if (previewBuilding) {
                        unitToRender = { ...previewBuilding, ownerIdx: State.playerIndex, hp: 1 }; // Mock unit
                        isPreview = true;
                    }
                }

                // 2a. Check for preview nexus move in BUYMOVE phase
                if (!unit && !previewBuilding && State.game.phase === 'buyMove') {
                        if (State.previewNexusLocation && State.previewNexusLocation[0] === r && State.previewNexusLocation[1] === c) {
                            unitToRender = { type: 'nexus', ownerIdx: State.playerIndex, hp: g.players[State.playerIndex].nexusHP };
                            isPreview = true;
                        }
                }

                // 2b. Check for preview nexus in SETUP phase
                if (!unit && !unitToRender && State.currentAction === 'setup') {
                    if (State.previewNexus && State.previewNexus[0] === r && State.previewNexus[1] === c) {
                        unitToRender = { type: 'nexus', ownerIdx: State.playerIndex, hp: g.players[State.playerIndex].nexusHP };
                        isPreview = true;
                    }
                }

                // 3. Render the unit (real or preview)
                if(unitToRender) {
                    // MODIFIED: FOW logic
                    const isMyUnit = unitToRender.ownerIdx === State.playerIndex;
                    const isOpponentUnit = g.players.length > 1 && !isMyUnit;

                    // Show if:
                    // 1. It's my unit
                    // 2. It's in my zone (sandbox = whole board)
                    // 3. It's an opponent unit *not* in my zone (sandbox never meets this)
                    
                    let showUnit = isMyUnit || isMyZone;
                    
                    // In 2-player, if it's an opponent unit NOT in my zone, hide it
                    if (g.players.length > 1 && isOpponentUnit && !isMyZone) {
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
                        // Add "PREVIEW" text and opacity for previewed units
                        const hpDisplay = (isPreview) ? `<div class="absolute bottom-0 right-0 text-[10px] bg-black/80 px-1 text-blue-300">PREVIEW</div>` : `<div class="absolute bottom-0 right-0 text-[10px] bg-black/80 px-1 text-white">${unitToRender.hp}/${maxHp}</div>`;
                        const previewClass = (isPreview) ? 'opacity-75' : '';
                        
                        cell.innerHTML = `<div class="absolute inset-0 p-1 ${color.stroke} ${color.bg} ${previewClass}">${svg}</div>${hpDisplay}`;
                    }
                }

                // 4. Interaction Highlights
                if(State.currentAction === 'setup' && isMyZone && !unit) cell.classList.add('cursor-pointer', 'hover:bg-white/20');
                // Check for !unitToRender to prevent highlighting occupied preview cells
                if(State.currentAction === 'place-pylon' && isMyZone && !unit && !unitToRender) cell.classList.add('cursor-pointer', 'hover:bg-cyan-500/50');
                if(State.currentAction === 'place-mirror' && isMyZone && !unit && !unitToRender) cell.classList.add('cursor-pointer', 'hover:bg-purple-500/50');
                if(State.currentAction === 'move-nexus-target') {
                    // Check against real units, not preview buildings
                    const isBlocked = GameLogic.getUnitAt(r, c, g); 
                    if(!isBlocked && GameLogic.isValidNexusMove(State.selectedLocation, [r,c], State.playerIndex, g)) {
                        cell.classList.add('cursor-pointer', 'bg-yellow-500/30', 'animate-pulse');
                    }
                }
                // --- End New Render Logic ---

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

        const oldMsg = DOM.$('#setup-waiting-msg');
        if (oldMsg) oldMsg.classList.add('hidden');

        if(g.phase === 'setup') {
            if(!g.players[State.playerIndex].nexusLocation) {
                if(controls.setup) controls.setup.classList.remove('hidden');
                // Req #1: Nexus Placement requires confirmation
                State.currentAction = 'setup'; 
                
                const btn = DOM.$('#confirm-nexus-btn');
                if(btn) {
                    // Enable button as soon as a preview is set
                    btn.disabled = !State.previewNexus; 
                    btn.textContent = State.previewNexus ? "Confirm Location" : "Select Cell";
                    // The handler will now use State.previewNexus
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
                btnMoveNexus.textContent = "Done";
                btnMoveNexus.classList.add('bg-yellow-500');
                btnMoveNexus.classList.remove('bg-yellow-600', 'hover:bg-yellow-500');
            } else {
                btnMoveNexus.textContent = "Move Nexus";
                btnMoveNexus.classList.remove('bg-yellow-500');
                btnMoveNexus.classList.add('bg-yellow-600', 'hover:bg-yellow-500');
            }
            const btnUndo = DOM.$('#undo-action-btn'); // New ID
            const mirrorControls = DOM.$('#mirror-rotation-controls');
            const separator = DOM.$('#buy-move-separator');
            
            // Req #3: Show/Hide Mirror Controls
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

            // Disable return-fire rule
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
                } catch (e) {
                    console.error("Failed to parse lastLaserPath", 0);
                }
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


        const getEdgeCoords = (dr, dc) => {
            if (dr === 0 && dc === 1) return ["0%", "50%"]; // from W
            if (dr === 0 && dc === -1) return ["100%", "50%"]; // from E
            if (dr === 1 && dc === 0) return ["50%", "0%"]; // from N
            if (dr === -1 && dc === 0) return ["50%", "100%"]; // from S
            if (dr === 1 && dc === 1) return ["0%", "0%"]; // from NW
            if (dr === 1 && dc === -1) return ["100%", "0%"]; // from NE
            if (dr === -1 && dc === 1) return ["0%", "100%"]; // from SW
            if (dr === -1 && dc === -1) return ["100%", "100%"]; // from SE
            return ["50%", "50%"];
        };

        let i = 0;
        const pulseSpeed = '0.5s';
        const pulseDelayStep = 0.05;
        const interval = setInterval(() => {
            if(i >= path.length) { 
                clearInterval(interval); // Stop the "in" animation

                // Start the "out" animation
                let j = 0;
                const fadeInterval = setInterval(() => {
                    const segment = DOM.$(`[data-laser-step="${j}"]`);
                    if (segment) segment.remove();

                    j++;

                    if (j >= path.length) {
                        clearInterval(fadeInterval); // Stop the "out" animation
                        if (onCompleteCallback) onCompleteCallback(); // Update the board
                    }
                }, 120);

                return;
            }

            const [r, c] = path[i];
            const prev = path[i-1];
            const next = (i + 1 < path.length) ? path[i+1] : null;

            // MODIFIED: FOW for laser
            const isMySide = (c >= myZoneStart && c < myZoneEnd);
            if (State.game.players.length === 1 || isMySide) {
                const cell = DOM.$(`[data-r="${r}"][data-c="${c}"]`);

                if(cell) { 
                    cell.style.setProperty('--laser-color', hex);
                    let svgHTML = '';
                    if (i === 0 && next) {
                        let dr_out, dc_out;
                        if (shotVector) {
                            [dr_out, dc_out] = shotVector; // Use the direct shot vector
                        } else {
                            // Fallback to old logic just in case
                            dr_out = next[0] - r;
                            dc_out = next[1] - c;
                        }
                        const [x_out, y_out] = getEdgeCoords(dr_out * -1, dc_out * -1);
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

                        const [x_in, y_in] = getEdgeCoords(dr_in, dc_in);

                        if (isWallReflect_In) {
                            const [x_out, y_out] = getEdgeCoords(dr_in * -1, dc_in * -1);
                            const delay = i * pulseDelayStep;
                            const animStyle = `animation: laser-wave-pulse ${pulseSpeed} ease-in-out infinite; animation-delay: ${delay}s;`;
                            svgHTML = `<line x1="${x_in}" y1="${y_in}" x2="${x_out}" y2="${y_out}" stroke="${hex}" stroke-width="15" stroke-linecap="round" style="${animStyle}" />`;
                        } else if (isWallReflect_Out) {
                            const [x_out, y_out] = getEdgeCoords(dr_out * -1, dc_out * -1);
                            const [x_in_new, y_in_new] = getEdgeCoords(dr_out, dc_out);
                            const delay = i * pulseDelayStep;
                            const animStyle = `animation: laser-wave-pulse ${pulseSpeed} ease-in-out infinite; animation-delay: ${delay}s;`;
                            svgHTML = `<line x1="${x_in_new}" y1="${y_in_new}" x2="${x_out}" y2="${y_out}" stroke="${hex}" stroke-width="15" stroke-linecap="round" style="${animStyle}" />`;
                        }
                        else if (isPassthrough) {
                            const [x_out, y_out] = getEdgeCoords(dr_out * -1, dc_out * -1);
                            const delay = i * pulseDelayStep;
                            const animStyle = `animation: laser-wave-pulse ${pulseSpeed} ease-in-out infinite; animation-delay: ${delay}s;`;
                            svgHTML = `<line x1="${x_in}" y1="${y_in}" x2="${x_out}" y2="${y_out}" stroke="${hex}" stroke-width="15" stroke-linecap="round" style="${animStyle}" />`;
                        } else if (isReflection) {
                            const [x_out, y_out] = getEdgeCoords(dr_out * -1, dc_out * -1);
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
        
        // --- Lobby View (Main Menu) Handlers ---
        DOM.$('#multi-player-btn').onclick = () => {
            UIManager.show('lobbyList');
            API.presence.start(); 
            API.lobby.listenToList(); 
        };

        // NEW: Single Player Button
        DOM.$('#single-player-btn').onclick = () => {
            UIManager.show('singleplayer');
            API.presence.stop();
            API.lobby.stopListeningToList();
        };

        // NEW: Single Player View Handlers
        DOM.$('#singleplayer-back-btn').onclick = () => {
            UIManager.show('lobby');
        };
        DOM.$('#start-sandbox-btn').onclick = () => {
            const energy = DOM.spEnergySelect.value;
            const hp = DOM.spNexusHpSelect.value;
            API.game.startSandbox(parseInt(energy), parseInt(hp));
        };


        // MODIFIED: Profile editing
        DOM.$('#edit-name-btn').onclick = () => {
            DOM.lobbyNameDisplay.classList.add('hidden');
            DOM.lobbyNameEdit.classList.remove('hidden');
            DOM.lobbyNameInput.value = State.currentUser.profile.displayName;
            DOM.lobbyColorInput.value = State.currentUser.profile.preferredColor; // Set color
            DOM.lobbyNameInput.focus();
        };
        DOM.$('#cancel-name-btn').onclick = () => {
            DOM.lobbyNameDisplay.classList.remove('hidden');
            DOM.lobbyNameEdit.classList.add('hidden');
        };
        DOM.$('#save-name-btn').onclick = () => {
            const newName = DOM.lobbyNameInput.value;
            const newColor = DOM.lobbyColorInput.value; // Get color
            if (newName && (newName !== State.currentUser.profile.displayName || newColor !== State.currentUser.profile.preferredColor)) {
                API.saveProfile(newName, newColor); // Save both
                UIManager.toast("Profile updated!");
            }
            DOM.lobbyNameDisplay.classList.remove('hidden');
            DOM.lobbyNameEdit.classList.add('hidden');
        };

        // MODIFIED: To be async and pass settings
        DOM.$('#show-create-lobby-btn').onclick = async () => {
            const defaultName = `${State.currentUser.profile.displayName}'s Game`;
            const defaultEnergy = 10;
            const defaultNexusHP = 3; // New default
            const defaultColor = State.currentUser.profile.preferredColor;
            
            // Await creation so we are immediately put in the lobby
            await API.lobby.create(defaultName, defaultEnergy, defaultColor, defaultNexusHP);
        };

        // --- Invite Handler (Event Delegation) ---
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
        
        // --- Waiting Room & Modal ---
        DOM.$('#leave-lobby-btn').onclick = API.lobby.leave;
        DOM.$('#back-to-main-menu-btn').onclick = () => {
            UIManager.show('lobby');
            API.presence.stop(); 
            API.lobby.stopListeningToList();
        };
        DOM.$('#new-game-btn').onclick = () => { 
            DOM.views.modal.classList.add('hidden'); 
            API.lobby.leave(); // This already sends user to 'lobbyList'
            // Manually trigger a refresh after a short delay
            setTimeout(() => {
                const refreshBtn = DOM.$('#refresh-lobbies-btn');
                if (refreshBtn) refreshBtn.click();
            }, 100); 
        };

        // --- Game Actions ---
        DOM.$('#place-pylon-btn').onclick = () => { State.currentAction = 'place-pylon'; UIManager.renderBoard(); };
        DOM.$('#place-mirror-btn').onclick = () => { State.currentAction = 'place-mirror'; UIManager.renderBoard(); };
        DOM.$('#move-nexus-btn').onclick = () => {
            if (State.currentAction === 'move-nexus-target') {
                State.currentAction = null;
                State.selectedLocation = null;
            } else {
                State.currentAction = 'move-nexus-target';
                State.selectedLocation = State.game.players[State.playerIndex].nexusLocation;
            }
            UIManager.renderGame(); // Re-render board and controls
        };

        // This button is now for CONFIRMING placements
        DOM.$('#attack-btn').onclick = () => {
            const hasBuildingPreviews = State.previewBuildings.length > 0;
            const hasNexusPreview = !!State.previewNexusLocation;

            if (hasBuildingPreviews || hasNexusPreview) {
                // Pass both previews to the API function
                API.game.confirmBuyMovePhase(State.previewBuildings, State.previewNexusLocation);
            } else {
                // No previews, just move to attack phase
                API.game.endPhase();
            }
        };

        DOM.$('#end-turn-btn').onclick = () => {
            API.game.commitAndEndTurn(State.previewBuildings, State.previewNexusLocation);
        };

        DOM.$('#undo-action-btn').onclick = () => {
            State.previewBuildings = [];
            State.previewCost = 0;
            State.previewNexusLocation = null;
            UIManager.renderGame(); // Re-render everything
        };

        DOM.$$('.mirror-rotate-btn').forEach(btn => {
            btn.onclick = () => {
                const orientation = btn.dataset.orientation;
                State.currentMirrorOrientation = orientation;
                DOM.$('#mirror-orientation-display').textContent = orientation;
                
                // Check if last preview building is a mirror
                if (State.currentAction === 'place-mirror' && State.previewBuildings.length > 0) {
                    const lastBuilding = State.previewBuildings[State.previewBuildings.length - 1];
                    if (lastBuilding.type === 'mirror') {
                        // Update its orientation live
                        lastBuilding.orientation = orientation;
                        UIManager.renderBoard(); // Just re-render the board to show change
                    }
                }
            };
        });
        
        DOM.$$('button[data-dir]').forEach(btn => {
            btn.onclick = () => {
                const dir = CONSTANTS.DIRECTIONS[btn.dataset.dir];
                API.game.attack(dir[0], dir[1]);
            };
        });
        DOM.$('#skip-attack-btn').onclick = API.game.cancelAttack;
        DOM.$('#abandon-game-btn').onclick = () => {
            // We can just re-use the lobby leave logic
            API.lobby.leave();
            UIManager.toast("Game abandoned.");
        };
    },
    
    // NEW: Handler for sending invites
    sendInvite: async (toUid, toName) => {
        try {
            let gameId = State.gameId;

            // If not in a lobby, create one
            if (!gameId) {
                UIManager.toast("Creating new lobby...");
                const defaultName = `${State.currentUser.profile.displayName}'s Invite Lobby`;
                gameId = await API.lobby.create(defaultName, 10, State.currentUser.profile.preferredColor, CONSTANTS.NEXUS_HP);
                if (!gameId) throw new Error("Lobby creation failed.");
                // API.lobby.create already starts listening, which will set State.game
            }
            
            // We need to wait for State.game to be populated by the listener
            // A simple delay/check, or trust the create() call
            if (!State.game) {
                // Wait a moment for listener to fire
                await new Promise(r => setTimeout(r, 500)); 
                if (!State.game) throw new Error("Game state not ready.");
            }

            // Now send the invite
            await API.presence.sendInvite(toUid, toName, gameId);

        } catch (err) {
            console.error("Invite Error:", err);
            UIManager.showError(err.message);
        }
    },

    boardClick: (r, c) => {
        const act = State.currentAction;
        
        // MODIFIED: Sandbox mode zone
        let isMine;
        if (State.game.players.length > 1) {
            isMine = (c >= (State.playerIndex === 0 ? 0 : 5) && c < (State.playerIndex === 0 ? 5 : 10));
        } else {
            isMine = true; // Whole board is yours in sandbox
        }
        
        // Check for any existing unit (real or preview)
        const realUnit = GameLogic.getUnitAt(r,c, State.game);
        const previewUnit = State.previewBuildings.find(b => b.location[0] === r && b.location[1] === c);
        const previewNexus = State.previewNexusLocation && State.previewNexusLocation[0] === r && State.previewNexusLocation[1] === c;
        const isOccupied = realUnit || previewUnit || previewNexus;

        // Req #1: Nexus setup just updates the preview
        if(act === 'setup' && isMine && !realUnit) { 
            State.previewNexus = [r,c];
            UIManager.renderBoard();
            UIManager.renderControls(0); // Pass 0, budget not relevant
            return; // Stop here
        }
        
        // --- New Building Placement Logic (Req #2, #4, #5) ---
        const budget = (State.game.turnBudget || 0) - State.previewCost;
        const isSandbox = State.game.players.length === 1;
        
        if((act === 'place-pylon' || act === 'place-mirror') && isMine && !isOccupied) {
            if (!isSandbox) {
                if (budget < 1) {
                    UIManager.toast("Out of budget for this turn.");
                    return;
                }
                if (State.game.energyPool - State.previewCost < 1) {
                    UIManager.toast("Not enough energy in pool.");
                    return;
                }
            }

            const type = act.split('-')[1];
            const newPreviewBuilding = {
                type: type,
                location: [r,c]
            };
            
            if (type === 'mirror') {
                newPreviewBuilding.orientation = State.currentMirrorOrientation;
            }
            
            State.previewBuildings.push(newPreviewBuilding);

            if (!isSandbox)
                State.previewCost += 1;
            
            // Re-render board and controls (Req #4: allows placing multiples)
            UIManager.renderGame();
            return; // Stop here
        }
        
        if(act === 'move-nexus-target') {
            if(GameLogic.isValidNexusMove(State.selectedLocation, [r,c], State.playerIndex, State.game)) {
                State.previewNexusLocation = [r,c]; // Set preview instead of API call
                State.currentAction = null;
                State.selectedLocation = null;
            }
            // Don't return, allow re-render
        }
        
        // Re-render board/controls if no specific action was taken
        // This is good for deselecting, etc.
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