/**
 * Liens des professionnels : lecture publique par œuvre ou événement, gestion par leur propriétaire.
 */
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { validateId } = require('../middlewares/validationMiddleware');
const { translateDeep } = require('../helpers/i18n');
const liens = require('../services/liensExternes');

const repondreErreur = (res, err) => {
  if (!err.statusCode) throw err;
  res.status(err.statusCode).json({ success: false, error: err.message });
};

module.exports = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireValidatedProfessional } = authMiddleware;
  const pro = [authenticate, requireValidatedProfessional];

  router.get('/oeuvre/:id', validateId(), asyncHandler(async (req, res) => {
    res.json({ success: true, data: translateDeep(await liens.liensDeLOeuvre(models, Number(req.params.id)), req.lang) });
  }));
  router.get('/evenement/:id', validateId(), asyncHandler(async (req, res) => {
    res.json({ success: true, data: translateDeep(await liens.liensDeLEvenement(models, Number(req.params.id)), req.lang) });
  }));

  router.get('/mes-liens', ...pro, asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    res.json({ success: true, data: translateDeep(await liens.mesLiens(models, req.user.id_user), req.lang) });
  }));
  router.get('/mes-contenus', ...pro, asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    res.json({ success: true, data: translateDeep(await liens.mesContenus(models, req.user.id_user), req.lang) });
  }));

  router.post('/', ...pro, asyncHandler(async (req, res) => {
    try {
      const lien = await liens.creer(models, req.user.id_user, req.body || {});
      res.status(201).json({ success: true, data: { id_lien: lien.id_lien, type_lien: lien.type_lien } });
    } catch (err) {
      repondreErreur(res, err);
    }
  }));
  router.put('/:id', ...pro, validateId(), asyncHandler(async (req, res) => {
    try {
      const lien = await liens.modifier(models, Number(req.params.id), req.user.id_user, req.body || {});
      res.json({ success: true, data: { id_lien: lien.id_lien, type_lien: lien.type_lien } });
    } catch (err) {
      repondreErreur(res, err);
    }
  }));
  router.delete('/:id', authenticate, validateId(), asyncHandler(async (req, res) => {
    try {
      await liens.supprimer(models, Number(req.params.id), req.user.id_user, req.user.isAdmin === true);
      res.json({ success: true });
    } catch (err) {
      repondreErreur(res, err);
    }
  }));

  return router;
};
