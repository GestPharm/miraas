const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const vm = require('vm');

// Charger le contenu de app.js
const appPath = path.join(__dirname, '..', 'public', 'js', 'app.js');
const appJs = fs.readFileSync(appPath, 'utf8');

// Helper pour créer un DOM minimal avec tous les éléments nécessaires
function createDom() {
    const html = `<!doctype html><html><body>
        <div id="defunt"></div>
        <div id="heritiers"></div>
        <div id="resultats"><div id="results"></div><div id="heirsList"></div></div>
        <input id="estateValue" value="100000">
        <select id="deceasedGender"><option value="male">M</option><option value="female">F</option></select>
        <input id="husband" value="absent">
        <input id="wives" value="0">
        <input id="sons" value="0">
        <input id="daughters" value="0">
        <select id="father"><option value="absent">absent</option><option value="present">present</option></select>
        <select id="mother"><option value="absent">absent</option><option value="present">present</option></select>
        <input id="grandsonsBySon" value="0">
        <input id="granddaughtersBySon" value="0">
        <input id="grandsonsByDaughter" value="0">
        <input id="granddaughtersByDaughter" value="0">
        <input id="fullBrothers" value="0">
        <input id="fullSisters" value="0">
        <input id="paternalBrothers" value="0">
        <input id="paternalSisters" value="0">
        <input id="maternalBrothers" value="0">
        <input id="maternalSisters" value="0">
        <select id="paternalGrandfather"><option value="absent">absent</option><option value="present">present</option></select>
        <select id="paternalGrandmother"><option value="absent">absent</option><option value="present">present</option></select>
        <select id="maternalGrandfather"><option value="absent">absent</option><option value="present">present</option></select>
        <select id="maternalGrandmother"><option value="absent">absent</option><option value="present">present</option></select>
    </body></html>`;

    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const { window } = dom;

    // Stub fetch pour retourner les partials depuis le disque
    window.fetch = (p) => {
        const rel = p.replace(/^partials\//, 'public/partials/');
        const file = path.join(__dirname, '..', rel);
        if (fs.existsSync(file)) {
            const txt = fs.readFileSync(file, 'utf8');
            return Promise.resolve({ ok: true, text: async () => txt });
        }
        return Promise.resolve({ ok: false, status: 404 });
    };

    // Exposer des globals attendus par app.js
    const sandbox = {
        window: window,
        document: window.document,
        navigator: window.navigator,
        console: console,
        fetch: window.fetch,
        alert: (msg) => console.log('[alert]', msg),
        setTimeout: window.setTimeout,
        clearTimeout: window.clearTimeout
    };

    // Créer un contexte VM
    const context = vm.createContext(sandbox);
    // Exécuter app.js dans ce contexte
    const script = new vm.Script(appJs, { filename: 'app.js' });
    script.runInContext(context);

    return { window, document: window.document, context };
}

function getTotalDistributed(document) {
    const items = document.querySelectorAll('#heirsList .heir-item');
    for (let i = 0; i < items.length; i++) {
        const el = items[i];
        if (el.textContent && el.textContent.includes('Total distribué')) {
            // chercher le montant en €
            const m = el.textContent.match(/([0-9\s\.]+) ?€/);
            if (m) return m[1].trim();
        }
    }
    return null;
}

async function runScenario(scn) {
    const { window, document, context } = createDom();

    // régler les valeurs du scenario
    document.getElementById('estateValue').value = scn.estateValue;
    document.getElementById('deceasedGender').value = scn.deceasedGender;
    document.getElementById('husband').value = scn.husband || 'absent';
    document.getElementById('wives').value = scn.wives != null ? scn.wives : '0';
    document.getElementById('sons').value = scn.sons || '0';
    document.getElementById('daughters').value = scn.daughters || '0';
    document.getElementById('father').value = scn.father ? 'present' : 'absent';
    document.getElementById('mother').value = scn.mother ? 'present' : 'absent';
    document.getElementById('grandsonsBySon').value = scn.grandsonsBySon || '0';
    document.getElementById('granddaughtersBySon').value = scn.granddaughtersBySon || '0';
    document.getElementById('grandsonsByDaughter').value = scn.grandsonsByDaughter || '0';
    document.getElementById('granddaughtersByDaughter').value = scn.granddaughtersByDaughter || '0';
    document.getElementById('fullBrothers').value = scn.fullBrothers || '0';
    document.getElementById('fullSisters').value = scn.fullSisters || '0';
    document.getElementById('paternalBrothers').value = scn.paternalBrothers || '0';
    document.getElementById('paternalSisters').value = scn.paternalSisters || '0';
    document.getElementById('maternalBrothers').value = scn.maternalBrothers || '0';
    document.getElementById('maternalSisters').value = scn.maternalSisters || '0';
    document.getElementById('paternalGrandfather').value = scn.paternalGrandfather ? 'present' : 'absent';
    document.getElementById('paternalGrandmother').value = scn.paternalGrandmother ? 'present' : 'absent';
    document.getElementById('maternalGrandfather').value = scn.maternalGrandfather ? 'present' : 'absent';
    document.getElementById('maternalGrandmother').value = scn.maternalGrandmother ? 'present' : 'absent';

        // Attendre un court délai pour laisser d'éventuels partials se charger
        await new Promise(r => setTimeout(r, 50));

        // Ré-appliquer les valeurs au cas où les partials les auraient écrasées
        document.getElementById('estateValue').value = scn.estateValue;
        document.getElementById('deceasedGender').value = scn.deceasedGender;

    // Appeler la fonction calculateInheritance (définie dans app.js)
    if (typeof context.calculateInheritance !== 'function') {
        throw new Error('calculateInheritance non défini dans le contexte');
    }

    // Log pour debug: vérifier la valeur lue par le script
    console.log('debug estateValue (before):', document.getElementById('estateValue').value);
    // Exécuter
    context.calculateInheritance();

    // Attendre que l'affichage soit mis à jour
    await new Promise(r => setTimeout(r, 10));

    const total = getTotalDistributed(document);
    return { scenario: scn.name, totalDistributed: total, heirsHtml: document.getElementById('heirsList').innerHTML };
}

(async () => {
    const scenarios = [
        { name: 'Père seul, sans descendants', estateValue: '120000', deceasedGender: 'male', father: true, mother: false, sons: '0', daughters: '0' },
        { name: 'Avec descendant (fils) et père présent', estateValue: '100000', deceasedGender: 'male', father: true, sons: '1', daughters: '0' },
        { name: 'Père et mère sans descendants', estateValue: '80000', deceasedGender: 'male', father: true, mother: true, sons: '0', daughters: '0' }
    ];

    for (const s of scenarios) {
        try {
            const res = await runScenario(s);
            console.log(JSON.stringify(res, null, 2));
        } catch (err) {
            console.error('Erreur scénario', s.name, err);
        }
    }
    process.exit(0);
})();
