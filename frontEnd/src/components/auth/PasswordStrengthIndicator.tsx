import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface Rule {
  key: string;
  label: string;
  test: (pw: string) => boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
  const { t } = useTranslation();

  const rules: Rule[] = useMemo(() => [
    {
      key: 'minLength',
      label: t('passwordStrength.minLength', '12+ characters'),
      test: (pw: string) => pw.length >= 12,
    },
    {
      key: 'uppercase',
      label: t('passwordStrength.uppercase', '1 uppercase letter'),
      test: (pw: string) => /[A-Z]/.test(pw),
    },
    {
      key: 'lowercase',
      label: t('passwordStrength.lowercase', '1 lowercase letter'),
      test: (pw: string) => /[a-z]/.test(pw),
    },
    {
      key: 'digit',
      label: t('passwordStrength.digit', '1 digit'),
      test: (pw: string) => /\d/.test(pw),
    },
    {
      key: 'special',
      label: t('passwordStrength.special', '1 special character'),
      test: (pw: string) => /[^A-Za-z0-9]/.test(pw),
    },
  ], [t]);

  const passed = rules.filter((r) => r.test(password)).length;
  const total = rules.length;
  const percent = total > 0 ? (passed / total) * 100 : 0;

  const barColor = (() => {
    if (passed <= 1) return 'bg-red-500';
    if (passed <= 2) return 'bg-orange-500';
    if (passed <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  })();

  const strengthLabel = (() => {
    if (passed <= 1) return t('passwordStrength.weak', 'Weak');
    if (passed <= 2) return t('passwordStrength.fair', 'Fair');
    if (passed <= 3) return t('passwordStrength.good', 'Good');
    return t('passwordStrength.strong', 'Strong');
  })();

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
          {strengthLabel}
        </span>
      </div>

      {/* Rules checklist */}
      <ul className="space-y-1">
        {rules.map((rule) => {
          const met = rule.test(password);
          return (
            <li key={rule.key} className="flex items-center text-xs">
              <span className={`me-2 ${met ? 'text-green-600' : 'text-gray-400'}`}>
                {met ? '\u2713' : '\u2717'}
              </span>
              <span className={met ? 'text-green-700' : 'text-gray-500'}>
                {rule.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PasswordStrengthIndicator;
