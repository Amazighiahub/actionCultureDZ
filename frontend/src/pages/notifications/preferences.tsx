// pages/notifications/preferences.tsx - Page de gestion des préférences de notifications
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Calendar,
  Settings,
  Save,
  ArrowLeft,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Info,
  Check } from
'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '@/services/notification.service';
import { useNotifications } from '@/hooks/useNotifications';
import type { NotificationPreferences, UpdatePreferencesData } from '@/types/models/notification.types';

// Composant Switch personnalisé
import { useTranslation } from "react-i18next";const Switch: React.FC<{
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onCheckedChange, disabled = false }) => {const { t } = useTranslation();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full
        transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${checked ? 'bg-blue-600' : 'bg-gray-200'}
      `}>

      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `} />

    </button>);

};

// Composant pour une section de préférences
const PreferenceSection: React.FC<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, icon, children }) => {const { t } = useTranslation();
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        {icon && <div className="text-gray-600 mt-1">{icon}</div>}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {description &&
          <p className="text-sm text-gray-600 mt-1">{description}</p>
          }
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>);

};

// Composant pour un élément de préférence
const PreferenceItem: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ label, description, checked, onChange, disabled = false }) => {const { t } = useTranslation();
  return (
    <label className={`flex items-start justify-between ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex-1 pr-4">
        <span className="font-medium text-gray-900">{label}</span>
        {description &&
        <p className="text-sm text-gray-600 mt-1">{description}</p>
        }
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled} />

    </label>);

};

// Page principale des préférences
export default function NotificationPreferences() {
  const navigate = useNavigate();
  const { requestNotificationPermission } = useNotifications();

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    global: {
      actives: true,
      email: true,
      sms: false
    },
    types: {
      nouveauxEvenements: true,
      modificationsProgramme: true,
      rappels: true
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  // Charger les préférences au montage
  const { t } = useTranslation();useEffect(() => {
    loadPreferences();
    checkBrowserPermission();
  }, []);

  // Vérifier la permission du navigateur
  const checkBrowserPermission = () => {
    if ('Notification' in window) {
      setBrowserPermission(window.Notification.permission);
    }
  };

  // Charger les préférences depuis l'API
  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      const prefs = await notificationService.getPreferences();
      setPreferences(prefs);
    } catch (err: any) {
      console.error('Erreur chargement préférences:', err);
      setError('Impossible de charger les préférences');
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder les préférences
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaved(false);

      const updateData: UpdatePreferencesData = {
        global: preferences.global,
        types: preferences.types
      };

      await notificationService.updatePreferences(updateData);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('Erreur sauvegarde:', err);
      setError('Impossible de sauvegarder les préférences');
    } finally {
      setSaving(false);
    }
  };

  // Demander la permission navigateur
  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setBrowserPermission(granted ? 'granted' : 'denied');
  };

  // Mettre à jour une préférence globale
  const updateGlobalPreference = (key: keyof typeof preferences.global, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      global: {
        ...prev.global,
        [key]: value
      }
    }));
  };

  // Mettre à jour une préférence de type
  const updateTypePreference = (key: keyof typeof preferences.types, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      types: {
        ...prev.types,
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/notifications')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors">

                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{t("notifications_preferences.prfrences_notifications")}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message d'erreur */}
        {error &&
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        }

        {/* Permission navigateur */}
        {browserPermission !== 'granted' &&
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900">{t("notifications_preferences.notifications_navigateur_dsactives")}</h3>
                <p className="text-sm text-blue-800 mt-1">{t("notifications_preferences.activez_les_notifications")}

              </p>
                <button
                onClick={handleRequestPermission}
                className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">{t("notifications_preferences.activer_les_notifications")}


              </button>
              </div>
            </div>
          </div>
        }

        {/* Paramètres généraux */}
        <PreferenceSection
          title={t("notifications_preferences.title_paramtres_gnraux")}
          description={t("notifications_preferences.description_grez_vos_prfrences")}
          icon={<Settings className="w-5 h-5" />}>

          <PreferenceItem
            label={t("notifications_preferences.label_notifications_actives")}
            description={t("notifications_preferences.description_activer_dsactiver_toutes")}
            checked={preferences.global.actives}
            onChange={(checked) => updateGlobalPreference('actives', checked)} />

          
          <PreferenceItem
            label={t("notifications_preferences.label_notifications_par_email")}
            description={t("notifications_preferences.description_recevoir_les_notifications")}
            checked={preferences.global.email}
            onChange={(checked) => updateGlobalPreference('email', checked)}
            disabled={!preferences.global.actives} />

          
          <PreferenceItem
            label={t("notifications_preferences.label_notifications_sms")}
            description={t("notifications_preferences.description_recevoir_les_notifications_1")}
            checked={preferences.global.sms}
            onChange={(checked) => updateGlobalPreference('sms', checked)}
            disabled={!preferences.global.actives} />

        </PreferenceSection>

        {/* Types de notifications */}
        <PreferenceSection
          title={t("notifications_preferences.title_types_notifications")}
          description={t("notifications_preferences.description_choisissez_les_types")}
          icon={<Bell className="w-5 h-5" />}>

          <PreferenceItem
            label={t("notifications_preferences.label_nouveaux_vnements")}
            description={t("notifications_preferences.description_tre_notifi_lors")}
            checked={preferences.types.nouveauxEvenements}
            onChange={(checked) => updateTypePreference('nouveauxEvenements', checked)}
            disabled={!preferences.global.actives} />

          
          <PreferenceItem
            label={t("notifications_preferences.label_modifications_programme")}
            description={t("notifications_preferences.description_recevoir_des_alertes")}
            checked={preferences.types.modificationsProgramme}
            onChange={(checked) => updateTypePreference('modificationsProgramme', checked)}
            disabled={!preferences.global.actives} />

          
          <PreferenceItem
            label={t("notifications_preferences.label_rappels_dvnements")}
            description={t("notifications_preferences.description_recevoir_rappel_24h")}
            checked={preferences.types.rappels}
            onChange={(checked) => updateTypePreference('rappels', checked)}
            disabled={!preferences.global.actives} />

        </PreferenceSection>

        {/* Appareils */}
        <PreferenceSection
          title={t("notifications_preferences.title_appareils_canaux")}
          description={t("notifications_preferences.description_grez_comment_vous")}
          icon={<Smartphone className="w-5 h-5" />}>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Monitor className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <p className="font-medium">{t("notifications_preferences.navigateur_web")}</p>
                <p className="text-sm text-gray-600">
                  {browserPermission === 'granted' ?
                  '✓ Notifications activées' :
                  '✗ Notifications désactivées'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <p className="font-medium">{t("notifications_preferences.email")}</p>
                <p className="text-sm text-gray-600">
                  {preferences.global.email ?
                  '✓ Notifications par email activées' :
                  '✗ Notifications par email désactivées'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <p className="font-medium">{t("notifications_preferences.sms")}</p>
                <p className="text-sm text-gray-600">
                  {preferences.global.sms ?
                  '✓ Notifications SMS activées' :
                  '✗ Notifications SMS désactivées'}
                </p>
              </div>
            </div>
          </div>
        </PreferenceSection>

        {/* Bouton de sauvegarde */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => navigate('/notifications')}
            className="text-gray-600 hover:text-gray-800">{t("notifications_preferences.retour_aux_notifications")}


          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors
              ${saving ?
            'bg-gray-300 text-gray-500 cursor-not-allowed' :
            'bg-blue-600 text-white hover:bg-blue-700'}
            `}>

            {saving ?
            <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>{t("notifications_preferences.enregistrement")}

            </> :
            saved ?
            <>
                <Check className="w-4 h-4" />{t("notifications_preferences.enregistr")}

            </> :

            <>
                <Save className="w-4 h-4" />{t("notifications_preferences.enregistrer_les_prfrences")}

            </>
            }
          </button>
        </div>
      </div>
    </div>);

}