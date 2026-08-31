// Fonction pour basculer entre épouse(s) et époux
function toggleSpouseFields() {
    const deceasedGender = document.getElementById('deceasedGender').value;
    const husbandField = document.getElementById('husbandField');
    const wivesField = document.getElementById('wivesField');
    
    if (deceasedGender === 'female') {
        // Défunte femme - afficher époux, cacher épouses
        husbandField.style.display = 'block';
        wivesField.style.display = 'none';
        document.getElementById('wives').value = '0';
    } else {
        // Défunt homme - afficher épouses, cacher époux
        husbandField.style.display = 'none';
        wivesField.style.display = 'block';
        document.getElementById('husband').value = 'absent';
    }
}

// Initialiser l'affichage au chargement: charger le partial 'defunt' d'abord
document.addEventListener('DOMContentLoaded', function() {
    loadPartial('defunt').then(() => {
        try { toggleSpouseFields(); } catch (e) { /* champs non encore présents */ }
    }).catch(err => console.error('Erreur chargement initial partial:', err));
});

function switchTab(tabName) {
    console.log("Changement d'onglet vers:", tabName);

    // Charger le partial si nécessaire, puis afficher
    loadPartial(tabName).then(() => {
        // Masquer tous les onglets
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Désactiver tous les onglets
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Activer l'onglet sélectionné
        const targetTab = document.getElementById(tabName);
        if (targetTab) targetTab.classList.add('active');

        // Activer le bouton d'onglet correspondant
        document.querySelectorAll('.tab').forEach(tab => {
            if (tab.textContent.includes(getTabText(tabName))) tab.classList.add('active');
        });

        // Si on passe à l'onglet résultats, calculer l'héritage
        if (tabName === 'resultats') {
            console.log('Appel de calculateInheritance depuis switchTab');
            calculateInheritance();
        }
    }).catch(err => console.error('Erreur chargement partial:', err));
}

// Charge un partial HTML depuis /partials/{name}.html dans la div correspondante
function loadPartial(name) {
    return new Promise((resolve, reject) => {
        const container = document.getElementById(name);
        if (!container) return reject(new Error('Container introuvable: ' + name));

        if (container.getAttribute('data-loaded') === 'true') return resolve();

        fetch(`partials/${name}.html`).then(resp => {
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            return resp.text();
        }).then(html => {
            container.innerHTML = html;
            container.setAttribute('data-loaded', 'true');
            // Initialisation minimale après insertion
            try {
                if (name === 'defunt') toggleSpouseFields();
            } catch (e) { /* ignore */ }
            resolve();
        }).catch(reject);
    
    });

}

function getTabText(tabName) {
    const tabTexts = {
        'defunt': 'Défunt',
        'heritiers': 'Héritiers',
        'resultats': 'Résultats'
    };
    return tabTexts[tabName];
}

// ============================================================================
// VERSION CORRIGÉE de calculateInheritance()
// Corrections apportées (voir explications détaillées fournies séparément) :
//  1. Mère : règle des "Umariyyatain" (conjoint + père + mère seuls héritiers)
//  2. Père : distinction fils présent / filles seules / aucun descendant
//  3. Filles seules (sans fils) : part fixe coranique (1/2 ou 2/3), pas tout le reliquat
//  4. Exclusion des petits-enfants par fille (non héritiers en fiqh sunnite)
//  5. Correction du bug d'ordre Awl / petits-enfants par fils
//  6. Sœurs germaines/consanguines comme résiduaires avec les filles (en l'absence de père/fils)
//
// LIMITES CONNUES, NON traitées ici (à ajouter si besoin) :
//  - Complément de 1/6 pour une petite-fille par fils en présence d'une fille unique
//  - Calcul concurrentiel grand-père paternel / frères-sœurs (muqasama, spécifique malikite)
//  - Radd (retour du reliquat) excluant le conjoint, propre au malikisme
//  - Dhawu al-arham (parents utérins) en l'absence totale d'héritier coranique/asabah
// ============================================================================

function calculateInheritance() {
    console.log('Début du calcul de l\'héritage');

    const estateValue = parseFloat(document.getElementById('estateValue').value);
    const deceasedGender = document.getElementById('deceasedGender').value;

    if (!estateValue || estateValue <= 0) {
        alert('Veuillez entrer une valeur valide pour la succession');
        switchTab('defunt');
        return;
    }

    // --- Conjoint ---
    let husbandsCount = 0;
    let wivesCount = 0;
    if (deceasedGender === 'female') {
        husbandsCount = document.getElementById('husband').value === 'present' ? 1 : 0;
    } else {
        wivesCount = parseInt(document.getElementById('wives').value);
    }

    // --- Descendants ---
    const sonsCount = parseInt(document.getElementById('sons').value);
    const daughtersCount = parseInt(document.getElementById('daughters').value);
    const fatherPresent = document.getElementById('father').value === 'present';
    const motherPresent = document.getElementById('mother').value === 'present';

    const grandsonsBySonCount = parseInt(document.getElementById('grandsonsBySon').value);
    const granddaughtersBySonCount = parseInt(document.getElementById('granddaughtersBySon').value);

    // NOTE FIQH : les enfants de FILLE ("par fille") ne sont pas des héritiers
    // coraniques/agnatiques en droit sunnite. On lit les champs (pour ne pas casser
    // le formulaire existant) mais on ne les fait PLUS hériter.
    const grandsonsByDaughterCount = parseInt(document.getElementById('grandsonsByDaughter').value);
    const granddaughtersByDaughterCount = parseInt(document.getElementById('granddaughtersByDaughter').value);
    if (grandsonsByDaughterCount > 0 || granddaughtersByDaughterCount > 0) {
        console.warn('Petits-enfants par fille renseignés : ils ne sont pas héritiers en fiqh sunnite (dhawu al-arham), ils sont ignorés du calcul.');
    }

    // --- Frères et sœurs ---
    const fullBrothersCount = parseInt(document.getElementById('fullBrothers').value);
    const fullSistersCount = parseInt(document.getElementById('fullSisters').value);
    const paternalBrothersCount = parseInt(document.getElementById('paternalBrothers').value);
    const paternalSistersCount = parseInt(document.getElementById('paternalSisters').value);
    const maternalBrothersCount = parseInt(document.getElementById('maternalBrothers').value);
    const maternalSistersCount = parseInt(document.getElementById('maternalSisters').value);

    // --- Grands-parents ---
    const paternalGrandfatherPresent = document.getElementById('paternalGrandfather').value === 'present';
    const paternalGrandmotherPresent = document.getElementById('paternalGrandmother').value === 'present';
    const maternalGrandfatherPresent = document.getElementById('maternalGrandfather').value === 'present';
    const maternalGrandmotherPresent = document.getElementById('maternalGrandmother').value === 'present';

    let heirs = [];
    let totalShares = 0;

    const childrenCount = sonsCount + daughtersCount;
    // "Descendant en ligne masculine" = fils, ou (à défaut d'enfant direct) petit-fils par fils
    const hasSonLineDescendant = sonsCount > 0 || (childrenCount === 0 && grandsonsBySonCount > 0);
    // "A un descendant héritier" (pour les parts du conjoint / de la mère)
    const hasAnyDescendant = childrenCount > 0 ||
        (childrenCount === 0 && (grandsonsBySonCount > 0 || granddaughtersBySonCount > 0));

    // ---------------- ÉPOUX / ÉPOUSE(S) ----------------
    let spouseShare = 0;
    if (wivesCount > 0) {
        const wifeShare = hasAnyDescendant ? 1 / 8 : 1 / 4;
        const sharePerWife = wifeShare / wivesCount;
        heirs.push({
            name: `Épouse${wivesCount > 1 ? 's' : ''}`,
            share: wifeShare,
            amount: (estateValue * wifeShare).toFixed(2),
            count: wivesCount,
            type: 'fixed'
        });
        totalShares += wifeShare;
        spouseShare = wifeShare;
    }
    if (husbandsCount > 0) {
        const husbandShare = hasAnyDescendant ? 1 / 4 : 1 / 2;
        heirs.push({
            name: 'Époux',
            share: husbandShare,
            amount: (estateValue * husbandShare).toFixed(2),
            count: 1,
            type: 'fixed'
        });
        totalShares += husbandShare;
        spouseShare = husbandShare;
    }

    // ---------------- MÈRE ----------------
    // Règle de base + exception "Umariyyatain" (conjoint + père + mère = seuls héritiers)
    const siblingsCount = fullBrothersCount + fullSistersCount + paternalBrothersCount +
        paternalSistersCount + maternalBrothersCount + maternalSistersCount;
    let motherShare = 0;
    if (motherPresent) {
        if (hasAnyDescendant || siblingsCount >= 2) {
            motherShare = 1 / 6;
        } else if (fatherPresent && spouseShare > 0) {
            // Cas Umariyyatain : 1/3 du reliquat après la part du conjoint (et non 1/3 du total)
            motherShare = (1 - spouseShare) / 3;
        } else {
            motherShare = 1 / 3;
        }
        heirs.push({
            name: 'Mère',
            share: motherShare,
            amount: (estateValue * motherShare).toFixed(2),
            count: 1,
            type: 'fixed'
        });
        totalShares += motherShare;
    }

    // ---------------- PÈRE ----------------
    // a) descendant mâle (fils/petit-fils par fils) -> 1/6 fixe uniquement
    // b) filles seules (pas de fils) -> 1/6 fixe + reliquat (asabah)
    // c) aucun descendant -> tout le reliquat (asabah), sans plafond
    // b) et c) sont traités via un "1/6 provisoire" complété plus bas.
    let fatherIsProvisional = false;
    if (fatherPresent) {
        const fatherShare = 1 / 6;
        fatherIsProvisional = !hasSonLineDescendant;
        heirs.push({
            name: 'Père',
            share: fatherShare,
            amount: (estateValue * fatherShare).toFixed(2),
            count: 1,
            type: 'fixed',
            provisional: fatherIsProvisional
        });
        totalShares += fatherShare;
    }

    // ---------------- FILLES SEULES (pas de fils) : part fixe coranique ----------------
    // 1 fille -> 1/2 ; 2 filles ou plus -> 2/3 (partagé également)
    if (sonsCount === 0 && daughtersCount > 0) {
        const daughtersShare = daughtersCount === 1 ? 1 / 2 : 2 / 3;
        const sharePerDaughter = daughtersShare / daughtersCount;
        heirs.push({
            name: `Fille${daughtersCount > 1 ? 's' : ''}`,
            share: daughtersShare,
            amount: (estateValue * daughtersShare).toFixed(2),
            count: daughtersCount,
            type: 'fixed'
        });
        totalShares += daughtersShare;
    }

    // ---------------- PETITES-FILLES PAR FILS SEULES (si aucun enfant direct) ----------------
    if (childrenCount === 0 && grandsonsBySonCount === 0 && granddaughtersBySonCount > 0) {
        const gdShare = granddaughtersBySonCount === 1 ? 1 / 2 : 2 / 3;
        heirs.push({
            name: `Petite-fille par fils${granddaughtersBySonCount > 1 ? 's' : ''}`,
            share: gdShare,
            amount: (estateValue * gdShare).toFixed(2),
            count: granddaughtersBySonCount,
            type: 'fixed'
        });
        totalShares += gdShare;
    }

    // ---------------- AWL (réduction proportionnelle des parts fixes) ----------------
    let awlApplied = false;
    const fixedHeirs = heirs.filter(h => h.type === 'fixed');
    const totalFixed = fixedHeirs.reduce((s, h) => s + (h.share || 0), 0);
    if (totalFixed > 1 + 1e-12) {
        const factor = 1 / totalFixed;
        fixedHeirs.forEach(h => {
            h.share = (h.share || 0) * factor;
            h.amount = (estateValue * h.share).toFixed(2);
        });
        totalShares = fixedHeirs.reduce((s, h) => s + (h.share || 0), 0);
        heirs.unshift({
            name: 'Awl appliqué',
            share: 0, amount: 0, count: 0, type: 'note',
            note: `Awl appliqué : les parts fixes ont été réduites proportionnellement (facteur ${factor.toFixed(6)}) car leur somme dépassait 100%.`
        });
        awlApplied = true;
    }

    // ---------------- FILS (+ FILLES) : asabah, uniquement si un fils existe ----------------
    if (!awlApplied && sonsCount > 0) {
        const remainingShare = 1 - totalShares;
        if (remainingShare > 0) {
            const sonUnit = sonsCount * 2;
            const daughterUnit = daughtersCount;
            const totalUnits = sonUnit + daughterUnit;
            const sharePerUnit = remainingShare / totalUnits;

            const sonShare = sharePerUnit * 2 * sonsCount;
            heirs.push({
                name: `Fils${sonsCount > 1 ? 's' : ''}`,
                share: sonShare,
                amount: (estateValue * sonShare).toFixed(2),
                count: sonsCount,
                type: 'asabah'
            });
            if (daughtersCount > 0) {
                const daughterShare = sharePerUnit * daughtersCount;
                heirs.push({
                    name: `Fille${daughtersCount > 1 ? 's' : ''} (avec les fils)`,
                    share: daughterShare,
                    amount: (estateValue * daughterShare).toFixed(2),
                    count: daughtersCount,
                    type: 'asabah'
                });
            }
            totalShares += remainingShare;
        }
    }

    // ---------------- PETITS-FILS PAR FILS (+ petites-filles par fils) : asabah ----------------
    // Uniquement si aucun enfant direct (fils ou fille) n'existe.
    if (!awlApplied && childrenCount === 0 && grandsonsBySonCount > 0) {
        const remainingShare = 1 - totalShares;
        if (remainingShare > 0) {
            const maleUnit = grandsonsBySonCount * 2;
            const femaleUnit = granddaughtersBySonCount;
            const totalUnits = maleUnit + femaleUnit;
            const sharePerUnit = remainingShare / totalUnits;

            const maleShare = sharePerUnit * 2 * grandsonsBySonCount;
            heirs.push({
                name: `Petit-fils par fils${grandsonsBySonCount > 1 ? 's' : ''}`,
                share: maleShare,
                amount: (estateValue * maleShare).toFixed(2),
                count: grandsonsBySonCount,
                type: 'asabah'
            });
            if (granddaughtersBySonCount > 0) {
                const femaleShare = sharePerUnit * granddaughtersBySonCount;
                heirs.push({
                    name: `Petite-fille par fils${granddaughtersBySonCount > 1 ? 's' : ''} (avec les petits-fils)`,
                    share: femaleShare,
                    amount: (estateValue * femaleShare).toFixed(2),
                    count: granddaughtersBySonCount,
                    type: 'asabah'
                });
            }
            totalShares += remainingShare;
        }
    }

    // ---------------- FRÈRES ET SŒURS ----------------
    // Uniquement si : pas d'awl, aucun enfant direct, pas de père, aucun descendant par fils.
    const noSonLineDescendantAtAll = childrenCount === 0 && grandsonsBySonCount === 0 && granddaughtersBySonCount === 0;

    if (!awlApplied && !fatherPresent && noSonLineDescendantAtAll) {
        // Germains
        if (fullBrothersCount > 0 || fullSistersCount > 0) {
            const remainingShare = 1 - totalShares;
            if (remainingShare > 0) {
                if (fullSistersCount === 0) {
                    const sharePerBrother = remainingShare / fullBrothersCount;
                    heirs.push({
                        name: `Frère germain${fullBrothersCount > 1 ? 's' : ''}`,
                        share: sharePerBrother * fullBrothersCount,
                        amount: (estateValue * sharePerBrother * fullBrothersCount).toFixed(2),
                        count: fullBrothersCount, type: 'asabah'
                    });
                    totalShares += remainingShare;
                } else if (fullBrothersCount === 0 && fullSistersCount === 1) {
                    const sisterShare = 1 / 2;
                    heirs.push({ name: 'Sœur germaine', share: sisterShare, amount: (estateValue * sisterShare).toFixed(2), count: 1, type: 'fixed' });
                    totalShares += sisterShare;
                } else if (fullBrothersCount === 0 && fullSistersCount > 1) {
                    const sistersShare = 2 / 3;
                    heirs.push({
                        name: `Sœur germaine${fullSistersCount > 1 ? 's' : ''}`,
                        share: sistersShare, amount: (estateValue * sistersShare).toFixed(2),
                        count: fullSistersCount, type: 'fixed'
                    });
                    totalShares += sistersShare;
                } else {
                    const sisterUnit = fullSistersCount;
                    const brotherUnit = fullBrothersCount * 2;
                    const totalUnits = sisterUnit + brotherUnit;
                    const sharePerUnit = remainingShare / totalUnits;
                    heirs.push({
                        name: `Frère germain${fullBrothersCount > 1 ? 's' : ''}`,
                        share: sharePerUnit * 2 * fullBrothersCount,
                        amount: (estateValue * sharePerUnit * 2 * fullBrothersCount).toFixed(2),
                        count: fullBrothersCount, type: 'asabah'
                    });
                    heirs.push({
                        name: `Sœur germaine${fullSistersCount > 1 ? 's' : ''}`,
                        share: sharePerUnit * fullSistersCount,
                        amount: (estateValue * sharePerUnit * fullSistersCount).toFixed(2),
                        count: fullSistersCount, type: 'asabah'
                    });
                    totalShares += remainingShare;
                }
            }
        }

        // Maternels (1/6 si un seul, 1/3 partagé également si plusieurs)
        const maternalSiblingsCount = maternalBrothersCount + maternalSistersCount;
        if (maternalSiblingsCount > 0) {
            const maternalShare = maternalSiblingsCount === 1 ? 1 / 6 : 1 / 3;
            const sharePerMaternalSibling = maternalShare / maternalSiblingsCount;
            if (maternalBrothersCount > 0) {
                heirs.push({
                    name: `Frère maternel${maternalBrothersCount > 1 ? 's' : ''}`,
                    share: sharePerMaternalSibling * maternalBrothersCount,
                    amount: (estateValue * sharePerMaternalSibling * maternalBrothersCount).toFixed(2),
                    count: maternalBrothersCount, type: 'fixed'
                });
            }
            if (maternalSistersCount > 0) {
                heirs.push({
                    name: `Sœur maternelle${maternalSistersCount > 1 ? 's' : ''}`,
                    share: sharePerMaternalSibling * maternalSistersCount,
                    amount: (estateValue * sharePerMaternalSibling * maternalSistersCount).toFixed(2),
                    count: maternalSistersCount, type: 'fixed'
                });
            }
            totalShares += maternalShare;
        }
    }

    // ---------------- GRANDS-PARENTS ----------------
    // Simplification conservée : seulement si pas de père, pas de mère, aucun enfant/petit-fils par fils.
    // NB : n'implémente pas le calcul concurrentiel grand-père/frères propre au malikisme.
    if (!awlApplied && !fatherPresent && !motherPresent && noSonLineDescendantAtAll) {
        if (paternalGrandfatherPresent) {
            heirs.push({ name: 'Grand-père paternel', share: 1 / 6, amount: (estateValue / 6).toFixed(2), count: 1, type: 'fixed' });
            totalShares += 1 / 6;
        }
        if (paternalGrandmotherPresent) {
            heirs.push({ name: 'Grand-mère paternelle', share: 1 / 6, amount: (estateValue / 6).toFixed(2), count: 1, type: 'fixed' });
            totalShares += 1 / 6;
        }
        const maternalGrandparentsCount = (maternalGrandfatherPresent ? 1 : 0) + (maternalGrandmotherPresent ? 1 : 0);
        if (maternalGrandparentsCount > 0) {
            const sharePerMaternalGrandparent = (1 / 3) / maternalGrandparentsCount;
            if (maternalGrandfatherPresent) {
                heirs.push({ name: 'Grand-père maternel', share: sharePerMaternalGrandparent, amount: (estateValue * sharePerMaternalGrandparent).toFixed(2), count: 1, type: 'fixed' });
            }
            if (maternalGrandmotherPresent) {
                heirs.push({ name: 'Grand-mère maternelle', share: sharePerMaternalGrandparent, amount: (estateValue * sharePerMaternalGrandparent).toFixed(2), count: 1, type: 'fixed' });
            }
            totalShares += 1 / 3;
        }
    }

    // ---------------- SŒURS COMME RÉSIDUAIRES AVEC LES FILLES ----------------
    // Règle du hadith "faites des sœurs avec les filles des résiduaires" :
    // en l'absence de père et de fils, si des filles ont pris leur part fixe et qu'il
    // reste un reliquat, les frères/sœurs germains (à défaut, consanguins) le reçoivent.
    if (!awlApplied && !fatherPresent && sonsCount === 0 && daughtersCount > 0) {
        const leftover = 1 - totalShares;
        if (leftover > 1e-9) {
            if (fullBrothersCount > 0 || fullSistersCount > 0) {
                const brotherUnit = fullBrothersCount * 2;
                const sisterUnit = fullSistersCount;
                const totalUnits = brotherUnit + sisterUnit;
                const sharePerUnit = leftover / totalUnits;
                if (fullBrothersCount > 0) {
                    heirs.push({
                        name: `Frère germain${fullBrothersCount > 1 ? 's' : ''} (résiduaire avec les filles)`,
                        share: sharePerUnit * 2 * fullBrothersCount,
                        amount: (estateValue * sharePerUnit * 2 * fullBrothersCount).toFixed(2),
                        count: fullBrothersCount, type: 'asabah'
                    });
                }
                if (fullSistersCount > 0) {
                    heirs.push({
                        name: `Sœur germaine${fullSistersCount > 1 ? 's' : ''} (résiduaire avec les filles)`,
                        share: sharePerUnit * fullSistersCount,
                        amount: (estateValue * sharePerUnit * fullSistersCount).toFixed(2),
                        count: fullSistersCount, type: 'asabah'
                    });
                }
                totalShares += leftover;
            } else if (paternalBrothersCount > 0 || paternalSistersCount > 0) {
                const brotherUnit = paternalBrothersCount * 2;
                const sisterUnit = paternalSistersCount;
                const totalUnits = brotherUnit + sisterUnit;
                const sharePerUnit = leftover / totalUnits;
                if (paternalBrothersCount > 0) {
                    heirs.push({
                        name: `Frère consanguin${paternalBrothersCount > 1 ? 's' : ''} (résiduaire avec les filles)`,
                        share: sharePerUnit * 2 * paternalBrothersCount,
                        amount: (estateValue * sharePerUnit * 2 * paternalBrothersCount).toFixed(2),
                        count: paternalBrothersCount, type: 'asabah'
                    });
                }
                if (paternalSistersCount > 0) {
                    heirs.push({
                        name: `Sœur consanguine${paternalSistersCount > 1 ? 's' : ''} (résiduaire avec les filles)`,
                        share: sharePerUnit * paternalSistersCount,
                        amount: (estateValue * sharePerUnit * paternalSistersCount).toFixed(2),
                        count: paternalSistersCount, type: 'asabah'
                    });
                }
                totalShares += leftover;
            }
        }
    }

    // ---------------- COMPLÉMENT DU PÈRE (cas b et c) ----------------
    const provisionalFatherIndex = heirs.findIndex(h => h.name === 'Père' && h.provisional === true);
    if (provisionalFatherIndex !== -1) {
        if (!awlApplied) {
            const remainingAfterAllOtherFixed = 1 - totalShares;
            const extraForFather = remainingAfterAllOtherFixed > 0 ? remainingAfterAllOtherFixed : 0;
            if (extraForFather > 0) {
                heirs[provisionalFatherIndex].share += extraForFather;
                heirs[provisionalFatherIndex].amount = (estateValue * heirs[provisionalFatherIndex].share).toFixed(2);
                totalShares += extraForFather;
            }
        }
        delete heirs[provisionalFatherIndex].provisional;
    }

    console.log('Calcul terminé, affichage des résultats');
    loadPartial('resultats').then(() => {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        const targetTab = document.getElementById('resultats');
        if (targetTab) targetTab.classList.add('active');
        document.querySelectorAll('.tab').forEach(tab => {
            if (tab.textContent.includes(getTabText('resultats'))) tab.classList.add('active');
        });
        displayResults(heirs, estateValue);
    }).catch(err => {
        console.error('Erreur chargement partial resultats:', err);
        displayResults(heirs, estateValue);
    });
}

function displayResults(heirs, estateValue) {
    console.log('Affichage des résultats pour', heirs.length, 'héritiers');
    
    const resultsDiv = document.getElementById('results');
    const heirsListDiv = document.getElementById('heirsList');
    
    if (!resultsDiv || !heirsListDiv) {
        console.error('Éléments HTML non trouvés');
        return;
    }
    
    heirsListDiv.innerHTML = '';

    // Helper: convertir un décimal (0..1) en fraction simple "a/b"
    function decimalToFraction(value, maxDenominator = 48) {
        if (!isFinite(value) || value === 0) return '0';
        const sign = value < 0 ? '-' : '';
        const v = Math.abs(value);
        let best = { num: 0, den: 1, err: Infinity };
        for (let den = 1; den <= maxDenominator; den++) {
            const num = Math.round(v * den);
            const err = Math.abs(v - num / den);
            if (err < best.err - 1e-12) best = { num, den, err };
        }
        const gcd = (a, b) => b ? gcd(b, a % b) : a;
        const g = gcd(best.num, best.den) || 1;
        let num = Math.abs(best.num / g);
        let den = best.den / g;
        if (den === 1) return sign + String(num);
        if (num === 0) return '0';
        if (num >= den) {
            const whole = Math.floor(num / den);
            const rem = num % den;
            if (rem === 0) return sign + String(whole);
            return sign + `${whole} ${rem}/${den}`;
        }
        return sign + `${num}/${den}`;
    }

    let totalDistributed = 0;

    heirs.forEach(heir => {
        if (heir.type !== 'excluded') {
            totalDistributed += parseFloat(heir.amount);
        }
        
        const heirElement = document.createElement('div');
        heirElement.className = 'heir-item';
        
        if (heir.type === 'excluded') {
            heirElement.style.background = '#f8d7da';
            heirElement.style.border = '1px solid #f5c6cb';
        }
        
        let shareType = '';
        if (heir.type === 'fixed') {
            shareType = '<br><small style="color: #666;">Part fixe (Fard)</small>';
        } else if (heir.type === 'asabah') {
            shareType = '<br><small style="color: #666;">Part résiduelle (Asabah)</small>';
        } else if (heir.type === 'excluded') {
            shareType = '<br><small style="color: #dc3545;">Non héritant</small>';
        }
        
        let noteHtml = '';
        if (heir.note) {
            noteHtml = `<br><small style="color: #dc3545; font-style: italic;">${heir.note}</small>`;
        }
        
        // Pourcentage et fraction lisible
        const pct = (heir.share * 100) || 0;
        const frac = decimalToFraction(heir.share || 0);
        heirElement.innerHTML = `
            <div>
                <span class="heir-name">${heir.name} ${heir.count > 1 ? `(${heir.count})` : ''}</span>
                ${shareType}
                ${noteHtml}
            </div>
            <div style="text-align: right;">
                <div>${pct.toFixed(2)}% <small style="color:#666; margin-left:6px">(${frac})</small></div>
                <div class="heir-share" style="${heir.type === 'excluded' ? 'color: #dc3545;' : ''}">
                    ${parseFloat(heir.amount).toLocaleString('fr-FR')} €
                </div>
            </div>
        `;
        heirsListDiv.appendChild(heirElement);
    });

    // Affichage du total distribué
    const totalElement = document.createElement('div');
    totalElement.className = 'heir-item';
    totalElement.style.background = '#e8f5e8';
    const totalPct = (totalDistributed / estateValue) || 0;
    const totalFrac = decimalToFraction(totalPct);
    totalElement.innerHTML = `
        <span class="heir-name"><strong>Total distribué</strong></span>
        <div style="text-align: right;">
            <div><strong>${(totalPct * 100).toFixed(2)}% <small style="color:#666; margin-left:6px">(${totalFrac})</small></strong></div>
            <div class="heir-share"><strong>${totalDistributed.toLocaleString('fr-FR')} €</strong></div>
        </div>
    `;
    heirsListDiv.appendChild(totalElement);

    // Vérification s'il reste de l'argent non distribué
    const remaining = estateValue - totalDistributed;
    if (Math.abs(remaining) > 0.01) {
        const remainingElement = document.createElement('div');
        remainingElement.className = 'heir-item';
        remainingElement.style.background = remaining > 0 ? '#fff3cd' : '#ffe6e6';
        const remainingPct = (remaining / estateValue) || 0;
        const remainingFrac = decimalToFraction(Math.abs(remainingPct));
        remainingElement.innerHTML = `
            <span class="heir-name"><strong>${remaining > 0 ? 'Reste à distribuer' : 'Dépassement'}</strong></span>
            <div style="text-align: right;">
                <div><strong>${(remainingPct * 100).toFixed(2)}% <small style="color:#666; margin-left:6px">(${remainingFrac})</small></strong></div>
                <div class="heir-share" style="color: ${remaining > 0 ? '#e67e22' : '#e74c3c'};">
                    <strong>${Math.abs(remaining).toLocaleString('fr-FR')} €</strong>
                </div>
            </div>
        `;
        heirsListDiv.appendChild(remainingElement);
        
        if (remaining > 0) {
            const explanationElement = document.createElement('div');
            explanationElement.className = 'note';
            explanationElement.innerHTML = `
                💡 <strong>Explication :</strong> Le reste de la succession doit être distribué aux héritiers résiduels (Asabah) 
                selon les règles de priorité. En l'absence d'héritiers résiduels, le reste revient à Bayt al-Mal (trésor public musulman).
            `;
            heirsListDiv.appendChild(explanationElement);
        }
    }

    resultsDiv.style.display = 'block';
    console.log('Affichage des résultats terminé');
}
