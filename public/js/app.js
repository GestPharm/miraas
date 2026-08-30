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

function calculateInheritance() {
    console.log('Début du calcul de l\'héritage');
    
    // Récupération des valeurs
    const estateValue = parseFloat(document.getElementById('estateValue').value);
    const deceasedGender = document.getElementById('deceasedGender').value;
    
    // Validation
    if (!estateValue || estateValue <= 0) {
        alert('Veuillez entrer une valeur valide pour la succession');
        switchTab('defunt');
        return;
    }
    
    // Conjoint - différent selon le genre du défunt
    let husbandsCount = 0;
    let wivesCount = 0;
    
    if (deceasedGender === 'female') {
        husbandsCount = document.getElementById('husband').value === 'present' ? 1 : 0;
        wivesCount = 0;
    } else {
        husbandsCount = 0;
        wivesCount = parseInt(document.getElementById('wives').value);
    }
    
    const sonsCount = parseInt(document.getElementById('sons').value);
    const daughtersCount = parseInt(document.getElementById('daughters').value);
    const fatherPresent = document.getElementById('father').value === 'present';
    const motherPresent = document.getElementById('mother').value === 'present';
    
    // Petits-enfants
    const grandsonsBySonCount = parseInt(document.getElementById('grandsonsBySon').value);
    const granddaughtersBySonCount = parseInt(document.getElementById('granddaughtersBySon').value);
    const grandsonsByDaughterCount = parseInt(document.getElementById('grandsonsByDaughter').value);
    const granddaughtersByDaughterCount = parseInt(document.getElementById('granddaughtersByDaughter').value);
    
    // Frères et sœurs
    const fullBrothersCount = parseInt(document.getElementById('fullBrothers').value);
    const fullSistersCount = parseInt(document.getElementById('fullSisters').value);
    const paternalBrothersCount = parseInt(document.getElementById('paternalBrothers').value);
    const paternalSistersCount = parseInt(document.getElementById('paternalSisters').value);
    const maternalBrothersCount = parseInt(document.getElementById('maternalBrothers').value);
    const maternalSistersCount = parseInt(document.getElementById('maternalSisters').value);
    
    // Grands-parents
    const paternalGrandfatherPresent = document.getElementById('paternalGrandfather').value === 'present';
    const paternalGrandmotherPresent = document.getElementById('paternalGrandmother').value === 'present';
    const maternalGrandfatherPresent = document.getElementById('maternalGrandfather').value === 'present';
    const maternalGrandmotherPresent = document.getElementById('maternalGrandmother').value === 'present';

    let heirs = [];
    let totalShares = 0;

    // CALCUL DES PARTS FIXES (ZHAWI AL-FURUD)

    // ÉPOUSE(S) - pour défunt homme
    if (wivesCount > 0) {
        let wifeShare;
        const hasDescendants = sonsCount > 0 || daughtersCount > 0 || 
            grandsonsBySonCount > 0 || granddaughtersBySonCount > 0 ||
            grandsonsByDaughterCount > 0 || granddaughtersByDaughterCount > 0;
        
        if (hasDescendants) {
            wifeShare = 1/8; // 1/8 s'il y a des descendants
        } else {
            wifeShare = 1/4; // 1/4 s'il n'y a pas de descendants
        }
        const sharePerWife = wifeShare / wivesCount;
        heirs.push({
            name: `Épouse${wivesCount > 1 ? 's' : ''}`,
            share: sharePerWife,
            amount: (estateValue * sharePerWife * wivesCount).toFixed(2),
            count: wivesCount,
            type: 'fixed'
        });
        totalShares += wifeShare;
    }

    // ÉPOUX - pour défunte femme
    if (husbandsCount > 0) {
        let husbandShare;
        const hasDescendants = sonsCount > 0 || daughtersCount > 0 || 
            grandsonsBySonCount > 0 || granddaughtersBySonCount > 0 ||
            grandsonsByDaughterCount > 0 || granddaughtersByDaughterCount > 0;
        
        if (hasDescendants) {
            husbandShare = 1/4; // 1/4 s'il y a des descendants
        } else {
            husbandShare = 1/2; // 1/2 s'il n'y a pas de descendants
        }
        
        heirs.push({
            name: 'Époux',
            share: husbandShare,
            amount: (estateValue * husbandShare).toFixed(2),
            count: 1,
            type: 'fixed'
        });
        totalShares += husbandShare;
    }

    // PÈRE
    if (fatherPresent) {
        let fatherShare;
        const hasDescendants = sonsCount > 0 || daughtersCount > 0 || 
            grandsonsBySonCount > 0 || granddaughtersBySonCount > 0 ||
            grandsonsByDaughterCount > 0 || granddaughtersByDaughterCount > 0;
        if (hasDescendants) {
            // Père reçoit 1/6 en présence de descendants (règle malikite conservée)
            fatherShare = 1/6;
            heirs.push({
                name: 'Père',
                share: fatherShare,
                amount: (estateValue * fatherShare).toFixed(2),
                count: 1,
                type: 'fixed'
            });
            totalShares += fatherShare;
        } else {
            // Solution 2 : on attribue provisoirement 1/6 au père,
            // puis on calculera un complément après le calcul des autres parts fixes.
            fatherShare = 1/6;
            heirs.push({
                name: 'Père',
                share: fatherShare,
                amount: (estateValue * fatherShare).toFixed(2),
                count: 1,
                type: 'fixed',
                provisional: true
            });
            totalShares += fatherShare; // provisionnel, pourra être complété plus tard
        }
    }

    // MÈRE
    if (motherPresent) {
        let motherShare;
        const siblingsCount = fullBrothersCount + fullSistersCount + paternalBrothersCount + 
                                 paternalSistersCount + maternalBrothersCount + maternalSistersCount;
        const hasDescendants = sonsCount > 0 || daughtersCount > 0 || 
            grandsonsBySonCount > 0 || granddaughtersBySonCount > 0 ||
            grandsonsByDaughterCount > 0 || granddaughtersByDaughterCount > 0;
        
        if (hasDescendants || siblingsCount >= 2 || fatherPresent) {
            motherShare = 1/6; // 1/6 dans la plupart des cas
        } else {
            motherShare = 1/3; // 1/3 s'il n'y a pas de descendants, père, et moins de 2 frères/sœurs
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

    // === AWL (réduction proportionnelle) ===
    // Calculer la somme des parts fixes actuellement définies.
    let awlApplied = false;
    const fixedHeirs = heirs.filter(h => h.type === 'fixed');
    const totalFixed = fixedHeirs.reduce((s, h) => s + (h.share || 0), 0);
    if (totalFixed > 1 + 1e-12) {
        // Appliquer awl : facteur = 1 / totalFixed
        const factor = 1 / totalFixed;
        fixedHeirs.forEach(h => {
            h.share = (h.share || 0) * factor;
            h.amount = (estateValue * h.share).toFixed(2);
        });
        // Mettre à jour totalShares pour refléter la réduction
        totalShares = fixedHeirs.reduce((s, h) => s + (h.share || 0), 0);
        // Ajouter une entrée d'information pour l'affichage
        heirs.unshift({
            name: 'Awl appliqué',
            share: 0,
            amount: 0,
            count: 0,
            type: 'note',
            note: `Awl appliqué : les parts fixes ont été réduites proportionnellement (facteur ${factor.toFixed(6)}) car leur somme dépassait 100%.`
        });
        awlApplied = true;
    }

    // ENFANTS DIRECTS (système du 'Asabah) - PRIORITÉ 1
    const childrenCount = sonsCount + daughtersCount;
    if (!awlApplied) {
        if (childrenCount > 0) {
        const remainingShare = 1 - totalShares;
        if (remainingShare > 0) {
            // Un fils reçoit le double d'une fille
            const daughterUnit = daughtersCount;
            const sonUnit = sonsCount * 2;
            const totalUnits = daughterUnit + sonUnit;
            const sharePerUnit = remainingShare / totalUnits;

            if (sonsCount > 0) {
                const sonShare = sharePerUnit * 2;
                heirs.push({
                    name: `Fils${sonsCount > 1 ? 's' : ''}`,
                    share: sonShare * sonsCount,
                    amount: (estateValue * sonShare * sonsCount).toFixed(2),
                    count: sonsCount,
                    type: 'asabah'
                });
            }

            if (daughtersCount > 0) {
                const daughterShare = sharePerUnit;
                heirs.push({
                    name: `Fille${daughtersCount > 1 ? 's' : ''}`,
                    share: daughterShare * daughtersCount,
                    amount: (estateValue * daughterShare * daughtersCount).toFixed(2),
                    count: daughtersCount,
                    type: 'asabah'
                });
            }
            
            totalShares += remainingShare;
        }
        }
    } // fin guard awlApplied pour enfants/petits-enfants
    // PETITS-ENFANTS - PRIORITÉ 2 (seulement si pas d'enfants directs)
    else {
        const grandsonsCount = grandsonsBySonCount + grandsonsByDaughterCount;
        const granddaughtersCount = granddaughtersBySonCount + granddaughtersByDaughterCount;
        const grandchildrenCount = grandsonsCount + granddaughtersCount;
        
        if (grandchildrenCount > 0) {
            const remainingShare = 1 - totalShares;
            if (remainingShare > 0) {
                // Selon l'école malikite : inclure les petits-enfants par fils et par fille
                const maleGrandchildren = grandsonsBySonCount + grandsonsByDaughterCount;
                const femaleGrandchildren = granddaughtersBySonCount + granddaughtersByDaughterCount;
                const totalUnits = (maleGrandchildren * 2) + femaleGrandchildren;
                if (totalUnits > 0) {
                    const sharePerUnit = remainingShare / totalUnits;

                    if (maleGrandchildren > 0) {
                        const maleShare = sharePerUnit * 2;
                        heirs.push({
                            name: `Petit-fils${maleGrandchildren > 1 ? 's' : ''}`,
                            share: maleShare * maleGrandchildren,
                            amount: (estateValue * maleShare * maleGrandchildren).toFixed(2),
                            count: maleGrandchildren,
                            type: 'asabah'
                        });
                    }

                    if (femaleGrandchildren > 0) {
                        const femaleShare = sharePerUnit;
                        heirs.push({
                            name: `Petite-fille${femaleGrandchildren > 1 ? 's' : ''}`,
                            share: femaleShare * femaleGrandchildren,
                            amount: (estateValue * femaleShare * femaleGrandchildren).toFixed(2),
                            count: femaleGrandchildren,
                            type: 'asabah'
                        });
                    }

                    totalShares += remainingShare;
                }
            }
        }
    }

    // FRÈRES ET SŒURS - PRIORITÉ 3
    if (!awlApplied && childrenCount === 0 && !fatherPresent && 
        (grandsonsBySonCount + granddaughtersBySonCount + grandsonsByDaughterCount + granddaughtersByDaughterCount) === 0) {
        
        // Frères et sœurs germains
        if (fullBrothersCount > 0 || fullSistersCount > 0) {
            const remainingShare = 1 - totalShares;
            if (remainingShare > 0) {
                if (fullSistersCount === 0) {
                    // Seuls des frères germains
                    const sharePerBrother = remainingShare / fullBrothersCount;
                    heirs.push({
                        name: `Frère germain${fullBrothersCount > 1 ? 's' : ''}`,
                        share: sharePerBrother * fullBrothersCount,
                        amount: (estateValue * sharePerBrother * fullBrothersCount).toFixed(2),
                        count: fullBrothersCount,
                        type: 'asabah'
                    });
                } else if (fullBrothersCount === 0 && fullSistersCount === 1) {
                    // Une seule sœur germaine - 1/2
                    const sisterShare = 1/2;
                    heirs.push({
                        name: 'Sœur germaine',
                        share: sisterShare,
                        amount: (estateValue * sisterShare).toFixed(2),
                        count: 1,
                        type: 'fixed'
                    });
                    totalShares += sisterShare;
                } else if (fullBrothersCount === 0 && fullSistersCount > 1) {
                    // Deux sœurs germaines ou plus - 2/3
                    const sistersShare = 2/3;
                    const sharePerSister = sistersShare / fullSistersCount;
                    heirs.push({
                        name: `Sœur germaine${fullSistersCount > 1 ? 's' : ''}`,
                        share: sharePerSister * fullSistersCount,
                        amount: (estateValue * sharePerSister * fullSistersCount).toFixed(2),
                        count: fullSistersCount,
                        type: 'fixed'
                    });
                    totalShares += sistersShare;
                } else {
                    // Frères et sœurs germains - système du 'Asabah
                    const sisterUnit = fullSistersCount;
                    const brotherUnit = fullBrothersCount * 2;
                    const totalUnits = sisterUnit + brotherUnit;
                    const sharePerUnit = remainingShare / totalUnits;
                    
                    if (fullBrothersCount > 0) {
                        const brotherShare = sharePerUnit * 2;
                        heirs.push({
                            name: `Frère germain${fullBrothersCount > 1 ? 's' : ''}`,
                            share: brotherShare * fullBrothersCount,
                            amount: (estateValue * brotherShare * fullBrothersCount).toFixed(2),
                            count: fullBrothersCount,
                            type: 'asabah'
                        });
                    }
                    
                    if (fullSistersCount > 0) {
                        const sisterShare = sharePerUnit;
                        heirs.push({
                            name: `Sœur germaine${fullSistersCount > 1 ? 's' : ''}`,
                            share: sisterShare * fullSistersCount,
                            amount: (estateValue * sisterShare * fullSistersCount).toFixed(2),
                            count: fullSistersCount,
                            type: 'asabah'
                        });
                    }
                }
            }
        }
        
        // Frères et sœurs maternels
        const maternalSiblingsCount = maternalBrothersCount + maternalSistersCount;
        if (maternalSiblingsCount > 0) {
            let maternalShare;
            if (maternalSiblingsCount === 1) {
                maternalShare = 1/6;
            } else {
                maternalShare = 1/3;
            }
            
            const sharePerMaternalSibling = maternalShare / maternalSiblingsCount;
            
            if (maternalBrothersCount > 0) {
                heirs.push({
                    name: `Frère maternel${maternalBrothersCount > 1 ? 's' : ''}`,
                    share: sharePerMaternalSibling * maternalBrothersCount,
                    amount: (estateValue * sharePerMaternalSibling * maternalBrothersCount).toFixed(2),
                    count: maternalBrothersCount,
                    type: 'fixed'
                });
            }
            
            if (maternalSistersCount > 0) {
                heirs.push({
                    name: `Sœur maternelle${maternalSistersCount > 1 ? 's' : ''}`,
                    share: sharePerMaternalSibling * maternalSistersCount,
                    amount: (estateValue * sharePerMaternalSibling * maternalSistersCount).toFixed(2),
                    count: maternalSistersCount,
                    type: 'fixed'
                });
            }
            
            totalShares += maternalShare;
        }
    }

    // GRANDS-PARENTS - PRIORITÉ 4
    if (!awlApplied && !fatherPresent && !motherPresent && childrenCount === 0 && 
        grandsonsBySonCount === 0 && granddaughtersBySonCount === 0) {
        
        // Grand-père paternel
        if (paternalGrandfatherPresent) {
            heirs.push({
                name: 'Grand-père paternel',
                share: 1/6,
                amount: (estateValue * 1/6).toFixed(2),
                count: 1,
                type: 'fixed'
            });
            totalShares += 1/6;
        }
        
        // Grand-mère paternelle
        if (paternalGrandmotherPresent) {
            heirs.push({
                name: 'Grand-mère paternelle',
                share: 1/6,
                amount: (estateValue * 1/6).toFixed(2),
                count: 1,
                type: 'fixed'
            });
            totalShares += 1/6;
        }
        
        // Grands-parents maternels
        const maternalGrandparentsCount = (maternalGrandfatherPresent ? 1 : 0) + 
                                         (maternalGrandmotherPresent ? 1 : 0);
        if (maternalGrandparentsCount > 0) {
            const sharePerMaternalGrandparent = (1/3) / maternalGrandparentsCount;
            
            if (maternalGrandfatherPresent) {
                heirs.push({
                    name: 'Grand-père maternel',
                    share: sharePerMaternalGrandparent,
                    amount: (estateValue * sharePerMaternalGrandparent).toFixed(2),
                    count: 1,
                    type: 'fixed'
                });
            }
            
            if (maternalGrandmotherPresent) {
                heirs.push({
                    name: 'Grand-mère maternelle',
                    share: sharePerMaternalGrandparent,
                    amount: (estateValue * sharePerMaternalGrandparent).toFixed(2),
                    count: 1,
                    type: 'fixed'
                });
            }
            
            totalShares += 1/3;
        }
    }

    // Ajustement final pour le père (Solution 2)
    // Si le père a été ajouté comme 'provisional', lui attribuer le complément
    // du reste disponible après calcul de toutes les autres parts fixes.
    const provisionalFatherIndex = heirs.findIndex(h => h.name === 'Père' && h.provisional === true);
    if (provisionalFatherIndex !== -1) {
        const remainingAfterAllOtherFixed = 1 - totalShares;
        const extraForFather = remainingAfterAllOtherFixed > 0 ? remainingAfterAllOtherFixed : 0;
        if (extraForFather > 0) {
            heirs[provisionalFatherIndex].share = (heirs[provisionalFatherIndex].share || 0) + extraForFather;
            heirs[provisionalFatherIndex].amount = (estateValue * heirs[provisionalFatherIndex].share).toFixed(2);
            totalShares += extraForFather;
        }
        // Retirer le flag provisoire
        delete heirs[provisionalFatherIndex].provisional;
    }

    console.log('Calcul terminé, affichage des résultats');
    // Charger le partial 'resultats' si nécessaire, activer l'onglet puis afficher
    loadPartial('resultats').then(() => {
        // Activer l'onglet résultats
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
        // Tentative d'affichage même si le partial n'a pas pu être chargé
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
