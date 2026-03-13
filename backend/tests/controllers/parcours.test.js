const { test, expect } = require('@jest/globals');

//  fonction pour générer le parcours (pour le Controller)
function genererParcours(lieux, interets, tempsMax) {
    let selection = lieux.filter(l => interets.includes(l.type));
    
    let parcours = [];
    let tempsActuel = 0;

    for (let lieu of selection) {
        if (tempsActuel + lieu.duree <= tempsMax) {
            parcours.push(lieu);
            tempsActuel += lieu.duree;
        }
    }
    return parcours;
}

//Tests unitaires
test('Doit filtrer selon les intérêts', () => {
    const data = [
        { nom: 'Mosquée', type: 'culture', duree: 60 },
        { nom: 'Parc', type: 'nature', duree: 30 },
        { nom: 'Musée', type: 'culture', duree: 90 }
    ];

    // si on veut que de la culture
    const res = genererParcours(data, ['culture'], 200);
    
    expect(res.length).toBe(2); // Mosquée + Musée
    expect(res[0].nom).toBe('Mosquée');
});

test('Doit respecter le temps max', () => {
    const data = [
        { nom: 'Site A', type: 'histoire', duree: 60 },
        { nom: 'Site B', type: 'histoire', duree: 60 }
    ];

    const res = genererParcours(data, ['histoire'], 60);

    expect(res.length).toBe(1);
});