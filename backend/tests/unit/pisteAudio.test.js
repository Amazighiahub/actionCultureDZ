/**
 * Voix enregistrée dans le navigateur : acceptée seulement si le fichier n'a qu'une piste audio.
 * Buffers fabriqués à la main : en-tête EBML (WebM) avec ses CodecID, boîtes MP4 avec « hdlr ».
 */
const { typeVoix, codecsWebm, pistesMp4 } = require('../../utils/pisteAudio');

const EBML = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
const codec = (texte) => Buffer.concat([Buffer.from([0x86, 0x80 | texte.length]), Buffer.from(texte, 'latin1')]);
const webm = (...codecs) => Buffer.concat([EBML, Buffer.alloc(40), ...codecs.map(codec), Buffer.alloc(20)]);

const boite = (type, contenu = Buffer.alloc(0)) => {
  const taille = Buffer.alloc(4); taille.writeUInt32BE(8 + contenu.length);
  return Buffer.concat([taille, Buffer.from(type, 'latin1'), contenu]);
};
const hdlr = (piste) => boite('hdlr', Buffer.concat([Buffer.alloc(8), Buffer.from(piste, 'latin1'), Buffer.alloc(12)]));
const mp4 = (...pistes) => Buffer.concat([boite('ftyp', Buffer.from('iso5\0\0\0\0', 'latin1')), boite('moov', Buffer.concat(pistes.map(hdlr)))]);

describe('voix enregistrée dans le navigateur', () => {
  it('WebM Opus (Chrome, Android) : accepté comme audio/webm', () => {
    expect(codecsWebm(webm('A_OPUS'))).toEqual(['A_OPUS']);
    expect(typeVoix(webm('A_OPUS'), 'video/webm')).toBe('audio/webm');
  });

  it('WebM avec une piste vidéo : refusé', () => {
    expect(typeVoix(webm('V_VP8', 'A_OPUS'), 'video/webm')).toBeNull();
    expect(typeVoix(webm('V_VP9'), 'video/webm')).toBeNull();
  });

  it('WebM vidéo dont le CodecID a une taille sur deux octets, avec un faux A_OPUS : refusé', () => {
    const vp8Long = Buffer.concat([Buffer.from([0x86, 0x40, 0x05]), Buffer.from('V_VP8', 'latin1')]);
    const piege = Buffer.concat([EBML, Buffer.alloc(10), vp8Long, codec('A_OPUS')]);
    expect(typeVoix(piege, 'video/webm')).toBeNull();
  });

  it('MP4 avec un en-tête de piste vidéo (vmhd) caché : refusé', () => {
    const piege = Buffer.concat([mp4('soun'), boite('free', boite('vmhd', Buffer.alloc(8)))]);
    expect(typeVoix(piege, 'video/mp4')).toBeNull();
  });

  it('WebM sans piste audio reconnue : refusé', () => {
    expect(typeVoix(Buffer.concat([EBML, Buffer.alloc(100)]), 'video/webm')).toBeNull();
  });

  it('MP4 AAC (Safari) : accepté comme audio/mp4', () => {
    expect(pistesMp4(mp4('soun'))).toEqual(['soun']);
    expect(typeVoix(mp4('soun'), 'video/mp4')).toBe('audio/mp4');
  });

  it('MP4 avec une piste vidéo, ou sans description des pistes : refusé', () => {
    expect(typeVoix(mp4('vide', 'soun'), 'video/mp4')).toBeNull();
    expect(typeVoix(boite('ftyp', Buffer.from('iso5', 'latin1')), 'video/mp4')).toBeNull();
  });

  it('fichier audio ordinaire gardé tel quel ; autre type refusé', () => {
    expect(typeVoix(Buffer.from('ID3'), 'audio/mpeg')).toBe('audio/mpeg');
    expect(typeVoix(Buffer.alloc(10), 'image/png')).toBeNull();
  });
});
