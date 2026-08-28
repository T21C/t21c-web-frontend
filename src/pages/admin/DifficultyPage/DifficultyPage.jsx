import { routes } from '@/api/routes';
// tuf-search: #DifficultyPage #difficultyPage #admin #difficulty — Manage Difficulties
import React, { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useAuth } from "@/contexts/AuthContext";
import { useDifficultyContext } from "@/contexts/DifficultyContext";

import { MetaTags, AccessDenied } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { useLocation } from 'react-router-dom';
import { ScrollButton, CloseButton } from '@/components/common/buttons';
import { DifficultyPopup } from '@/components/popups/Difficulties';
import { DiscordRolesPopup } from '@/components/popups/DiscordRoles';
import api from '@/utils/api';
import { getCdnErrorMessage } from '@/utils/uploadErrors';
import { getRateLimitMessage, toastIfRateLimited } from '@/utils/rateLimitError';
import './difficultypage.css';
import { Tooltip } from 'react-tooltip';
import { EditIcon, ImageIcon, InfoIcon, RefreshIcon, TrashIcon } from '@/components/common/icons';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { RatingInput, CustomSelect } from '@/components/common/selectors';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { CDN_IMAGE_ACCEPT } from '@/config/constants/cdnImageAccept';
import {
  COMMUNITY_TAG_DEFAULT_KNOBS,
  minWeightToPassThreshold,
} from '@/utils/communityTags';

const EMPTY_TAG_KNOBS = {
  description: '',
  wilsonZ: '',
  scoreOn: '',
  scoreOff: '',
  scoringMode: '',
  requireTopPlay: '',
  allowedBands: [],
};

const EMPTY_NEW_TAG = {
  name: '',
  iconFile: null,
  icon: null,
  color: '#FF5733',
  group: '',
  isCommunity: false,
  ...EMPTY_TAG_KNOBS,
};

const COMMUNITY_TAG_BAND_OPTIONS = ['P', 'G', 'U', 'SPEC'];

function requireTopPlayFormValue(value) {
  if (value === true || value === 'true' || value === 1 || value === '1') return 'true';
  if (value === false || value === 'false' || value === 0 || value === '0') return 'false';
  return '';
}

function withCommunityTagKnobs(entity = {}) {
  return {
    ...entity,
    description: entity.description || '',
    wilsonZ: entity.wilsonZ ?? '',
    scoreOn: entity.scoreOn ?? '',
    scoreOff: entity.scoreOff ?? '',
    scoringMode: entity.scoringMode || '',
    requireTopPlay: requireTopPlayFormValue(entity.requireTopPlay),
    allowedBands: Array.isArray(entity.allowedBands) ? [...entity.allowedBands] : [],
  };
}

function appendCommunityTagKnobs(formData, source) {
  formData.append('description', source.description ?? '');
  formData.append('wilsonZ', source.wilsonZ === 0 || source.wilsonZ ? String(source.wilsonZ) : '');
  formData.append('scoreOn', source.scoreOn === 0 || source.scoreOn ? String(source.scoreOn) : '');
  formData.append('scoreOff', source.scoreOff === 0 || source.scoreOff ? String(source.scoreOff) : '');
  formData.append('scoringMode', source.scoringMode || '');
  formData.append('requireTopPlay', requireTopPlayFormValue(source.requireTopPlay));
  formData.append(
    'allowedBands',
    JSON.stringify(Array.isArray(source.allowedBands) ? source.allowedBands : []),
  );
}

function communityTagKnobsPayload(source) {
  return {
    wilsonZ: source.wilsonZ === 0 || source.wilsonZ ? source.wilsonZ : '',
    scoreOn: source.scoreOn === 0 || source.scoreOn ? source.scoreOn : '',
    scoreOff: source.scoreOff === 0 || source.scoreOff ? source.scoreOff : '',
    scoringMode: source.scoringMode || '',
    requireTopPlay: requireTopPlayFormValue(source.requireTopPlay),
    allowedBands: Array.isArray(source.allowedBands) ? source.allowedBands : [],
  };
}

function sameBandSelection(a, b) {
  const left = (Array.isArray(a) ? [...a] : []).sort().join(',');
  const right = (Array.isArray(b) ? [...b] : []).sort().join(',');
  return left === right;
}

function parsePositiveNumber(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseUnitInterval(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
}

function findTagGroupForForm(tagGroups, value) {
  if (!Array.isArray(tagGroups) || !value) return null;
  if (value.groupId != null) {
    const byId = tagGroups.find((group) => group.id === value.groupId);
    if (byId) return byId;
  }
  const name = String(value.group || '').trim();
  if (!name) return null;
  return tagGroups.find((group) => group.name === name) || null;
}

function resolvePreviewKnobs(value, tagGroups, inheritFromGroup) {
  const group = inheritFromGroup ? findTagGroupForForm(tagGroups, value) : null;
  return {
    wilsonZ:
      parsePositiveNumber(value.wilsonZ)
      ?? parsePositiveNumber(group?.wilsonZ)
      ?? COMMUNITY_TAG_DEFAULT_KNOBS.wilsonZ,
    scoreOn:
      parseUnitInterval(value.scoreOn)
      ?? parseUnitInterval(group?.scoreOn)
      ?? COMMUNITY_TAG_DEFAULT_KNOBS.scoreOn,
    scoreOff:
      parseUnitInterval(value.scoreOff)
      ?? parseUnitInterval(group?.scoreOff)
      ?? COMMUNITY_TAG_DEFAULT_KNOBS.scoreOff,
  };
}

function TagIconEditor({ icon, onSelectFile, onRemove, t, i18nPrefix }) {
  const inputRef = useRef(null);

  return (
    <div className="form-group">
      <label>{t(`${i18nPrefix}.icon.label`)}</label>
      <div className="tag-icon-editor">
        <input
          ref={inputRef}
          type="file"
          accept={CDN_IMAGE_ACCEPT}
          className="tag-icon-editor-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onSelectFile(file);
          }}
        />
        <button
          type="button"
          className="tag-icon-editor-preview"
          onClick={() => inputRef.current?.click()}
          aria-label={t(`${i18nPrefix}.icon.preview`)}
        >
          {icon ? (
            <img src={icon} alt="" />
          ) : (
            <ImageIcon size="28px" color="currentColor" />
          )}
        </button>
        {icon ? (
          <button
            type="button"
            className="tag-icon-editor-remove"
            onClick={onRemove}
            aria-label={t(`${i18nPrefix}.icon.remove`)}
          >
            <TrashIcon color="currentColor" size="20px" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CommunityTagScoringFields({
  value,
  onChange,
  t,
  includeDescription = false,
  includeAssignment = true,
  includeRequireTopPlay = true,
  inheritFromGroup = false,
  tagGroups = [],
  inactive = false,
}) {
  const toggleBand = (band) => {
    const current = Array.isArray(value.allowedBands) ? value.allowedBands : [];
    const next = current.includes(band)
      ? current.filter((item) => item !== band)
      : [...current, band];
    onChange({ ...value, allowedBands: next });
  };

  const preview = resolvePreviewKnobs(value, tagGroups, inheritFromGroup);
  const reqOn = minWeightToPassThreshold(preview.wilsonZ, preview.scoreOn);
  const reqOff = minWeightToPassThreshold(preview.wilsonZ, preview.scoreOff);
  const scoringModeOptions = [
    { value: '', label: t('difficulty.tags.fields.inherit') },
    { value: 'wilson', label: t('difficulty.tags.fields.modeWilson') },
    { value: 'skillset', label: t('difficulty.tags.fields.modeSkillset') },
  ];
  const scoringModeValue =
    scoringModeOptions.find((option) => option.value === (value.scoringMode || ''))
    || scoringModeOptions[0];
  const requireTopPlayOptions = [
    { value: 'false', label: t('difficulty.tags.fields.requireTopPlayOff') },
    { value: 'true', label: t('difficulty.tags.fields.requireTopPlayOn') },
  ];
  const requireTopPlayForm = requireTopPlayFormValue(value.requireTopPlay);
  const requireTopPlayValue =
    requireTopPlayOptions.find((option) => option.value === requireTopPlayForm)
    || requireTopPlayOptions[0];

  return (
    <>
      {includeDescription ? (
        <div className="form-group">
          <label>{t('difficulty.tags.fields.description')}</label>
          <textarea
            value={value.description || ''}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            rows={3}
          />
        </div>
      ) : null}
      {includeAssignment ? (
        <div
          className={`form-assignment-fields${inactive ? ' is-inactive' : ''}`}
          inert={inactive ? true : undefined}
        >
          <div className="form-group">
            <label>{t('difficulty.tags.fields.scoringMode')}</label>
            <CustomSelect
              options={scoringModeOptions}
              value={scoringModeValue}
              onChange={(option) => onChange({ ...value, scoringMode: option?.value ?? '' })}
              width="100%"
              direction="auto"
              isSearchable={false}
            />
          </div>
          {includeRequireTopPlay ? (
          <div className="form-group">
            <label>{t('difficulty.tags.fields.requireTopPlay')}</label>
            <p className="form-hint">{t('difficulty.tags.fields.requireTopPlayHint')}</p>
            <CustomSelect
              options={requireTopPlayOptions}
              value={requireTopPlayValue}
              onChange={(option) => onChange({ ...value, requireTopPlay: option?.value ?? '' })}
              width="100%"
              direction="auto"
              isSearchable={false}
            />
          </div>
          ) : null}
          <div className="form-group">
            <div className="form-group-label-with-info">
              <label>{t('difficulty.tags.fields.wilsonZ')}</label>
              <button
                type="button"
                className="form-info-button"
                data-tooltip-id="difficulty-wilson-z-info"
                aria-label={t('difficulty.tags.fields.wilsonZInfoAria')}
              >
                <InfoIcon color="currentColor" size={16} />
              </button>
              <Tooltip
                id="difficulty-wilson-z-info"
                place="top"
                noArrow
                style={{ zIndex: 1100 }}
              >
                {t('difficulty.tags.fields.wilsonZWeightHint')}
              </Tooltip>
            </div>
            <p className="form-hint">{t('difficulty.tags.fields.wilsonZHint')}</p>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder={t('difficulty.tags.fields.inherit')}
              value={value.wilsonZ}
              onChange={(e) => onChange({ ...value, wilsonZ: e.target.value })}
            />
          </div>
          <div className="form-group">
            <div className="form-group-label-row">
              <label>{t('difficulty.tags.fields.scoreOn')}</label>
              {reqOn != null ? (
                <span className="form-hint">{t('difficulty.tags.fields.reqVotes', { count: reqOn })}</span>
              ) : null}
            </div>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              placeholder={t('difficulty.tags.fields.inherit')}
              value={value.scoreOn}
              onChange={(e) => onChange({ ...value, scoreOn: e.target.value })}
            />
          </div>
          <div className="form-group">
            <div className="form-group-label-row">
              <label>{t('difficulty.tags.fields.scoreOff')}</label>
              {reqOff != null ? (
                <span className="form-hint">{t('difficulty.tags.fields.reqVotes', { count: reqOff })}</span>
              ) : null}
            </div>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              placeholder={t('difficulty.tags.fields.inherit')}
              value={value.scoreOff}
              onChange={(e) => onChange({ ...value, scoreOff: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{t('difficulty.tags.fields.allowedBands')}</label>
            <p className="form-hint">{t('difficulty.tags.fields.allowedBandsHint')}</p>
            <div className="form-group-bands">
              {COMMUNITY_TAG_BAND_OPTIONS.map((band) => (
                <label key={band} className="form-group-band">
                  <input
                    type="checkbox"
                    checked={Array.isArray(value.allowedBands) && value.allowedBands.includes(band)}
                    onChange={() => toggleBand(band)}
                  />
                  <span>{band}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

const DifficultyPage = () => {
  const { user } = useAuth();
  const { difficulties, loading: contextLoading, reloadDifficulties, setDifficulties } = useDifficultyContext();
  const { t } = useTranslation(['pages', 'common']);
  const location = useLocation();
  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('difficulty.meta.title'),
        description: t('difficulty.meta.description'),
        pathname: location.pathname,
        image: '/og-image.jpg',
        noindex: true,
      }),
    [t, location.pathname],
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingDifficulty, setEditingDifficulty] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [selectedAction, setSelectedAction] = useState({ type: '', data: null });
  const [newDifficulty, setNewDifficulty] = useState({
    id: '',
    name: '',
    type: 'PGU',
    icon: '',
    emoji: '',
    color: '#ffffff',
    baseScore: 0,
    legacy: '',
    legacyIcon: '',
    legacyEmoji: ''
  });
  const [deletingDifficulty, setDeletingDifficulty] = useState(null);
  const [showDeleteInput, setShowDeleteInput] = useState(false);
  const [fallbackDiff, setFallbackDiff] = useState('');
  const [verifiedPassword, setVerifiedPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [isAnyPopupOpen, setIsAnyPopupOpen] = useState(false);
  const [showInitialPasswordPrompt, setShowInitialPasswordPrompt] = useState(true);
  const [isReordering, setIsReordering] = useState(false);
  const [isTagsReordering, setIsTagsReordering] = useState(false);
  const [isGroupsReordering, setIsGroupsReordering] = useState(false);
  const [activeTab, setActiveTab] = useState('difficulties'); // 'difficulties' or 'tags'
  const [tagsSubTab, setTagsSubTab] = useState('tags'); // 'tags' or 'groups'
  const [showDiscordRolesPopup, setShowDiscordRolesPopup] = useState(false);
  
  // Tag management state
  const [tags, setTags] = useState([]);
  const [tagGroups, setTagGroups] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [originalTag, setOriginalTag] = useState(null); // Store original tag data for comparison
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [deletingTag, setDeletingTag] = useState(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newTag, setNewTag] = useState(EMPTY_NEW_TAG);

  // Fetch tags when tags tab is active
  useEffect(() => {
    if (activeTab === 'tags' && verifiedPassword) {
      fetchTags();
    }
  }, [activeTab, verifiedPassword]);

  const fetchTags = async () => {
    setTagsLoading(true);
    try {
      const [tagsResponse, groupsResponse] = await Promise.all([
        api.get(`${routes.database.difficulties.root()}/tags`, {
          headers: {
            'X-Super-Admin-Password': verifiedPassword,
          },
        }),
        api.get(routes.database.difficulties.tagGroups(), {
          headers: {
            'X-Super-Admin-Password': verifiedPassword,
          },
        }),
      ]);
      setTags(tagsResponse.data || []);
      setTagGroups(groupsResponse.data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast.error(t('difficulty.tags.notifications.fetchFailed'));
    } finally {
      setTagsLoading(false);
    }
  };

  const handleCreateTag = async () => {
    try {
      await toast.promise(
        (async () => {
          const formData = new FormData();
          formData.append('name', newTag.name);
          formData.append('color', newTag.color);
          if (newTag.group) {
            formData.append('group', newTag.group);
          }
          formData.append('isCommunity', newTag.isCommunity ? 'true' : 'false');
          appendCommunityTagKnobs(formData, newTag);

          if (newTag.iconFile) {
            formData.append('icon', newTag.iconFile);
          } else if (newTag.icon === null) {
            formData.append('icon', 'null');
          }

          const response = await api.post(`${routes.database.difficulties.root()}/tags`, formData, {
            headers: {
              'X-Super-Admin-Password': verifiedPassword,
              'Content-Type': 'multipart/form-data',
            },
          });
          if (newTag.icon && newTag.icon.startsWith('blob:')) {
            URL.revokeObjectURL(newTag.icon);
          }
          setIsCreatingTag(false);
          setNewTag(EMPTY_NEW_TAG);
          await fetchTags();
          return response.data;
        })(),
        {
          loading: t('difficulty.loading.savingTag'),
          success: t('difficulty.tags.notifications.created'),
          error: (err) =>
            getRateLimitMessage(err) ||
            getCdnErrorMessage(err, t('difficulty.tags.notifications.createFailed')),
        },
      );
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };

  const handleUpdateTag = async () => {
    try {
      await toast.promise(
        (async () => {
          const formData = new FormData();
          formData.append('name', editingTag.name);
          formData.append('color', editingTag.color);
          if (editingTag.group !== undefined) {
            formData.append('group', editingTag.group || '');
          }
          formData.append('isCommunity', editingTag.isCommunity ? 'true' : 'false');
          appendCommunityTagKnobs(formData, editingTag);

          if (editingTag.iconFile) {
            formData.append('icon', editingTag.iconFile);
          } else if (editingTag.icon === null && editingTag.icon !== undefined) {
            formData.append('icon', 'null');
          }

          const response = await api.put(
            `${routes.database.difficulties.root()}/tags/${editingTag.id}`,
            formData,
            {
              headers: {
                'X-Super-Admin-Password': verifiedPassword,
                'Content-Type': 'multipart/form-data',
              },
            },
          );
          setTags((prev) => prev.map((tag) => (tag.id === editingTag.id ? response.data : tag)));
          if (editingTag.icon && editingTag.icon.startsWith('blob:')) {
            URL.revokeObjectURL(editingTag.icon);
          }
          setEditingTag(null);
          setOriginalTag(null);
          await fetchTags();
          return response.data;
        })(),
        {
          loading: t('difficulty.loading.updatingTag'),
          success: t('difficulty.tags.notifications.updated'),
          error: (err) =>
            getRateLimitMessage(err) ||
            getCdnErrorMessage(err, t('difficulty.tags.notifications.updateFailed')),
        },
      );
    } catch (error) {
      console.error('Error updating tag:', error);
    }
  };

  // Check if there are unsaved changes in the editing tag
  const hasUnsavedChanges = () => {
    if (!editingTag || !originalTag) return false;
    
    // Compare name
    if (editingTag.name !== originalTag.name) return true;
    
    // Compare color
    if (editingTag.color !== originalTag.color) return true;
    
    // Compare group (handle null/undefined/empty string)
    const editingGroup = (editingTag.group || '').trim();
    const originalGroup = (originalTag.group || '').trim();
    if (editingGroup !== originalGroup) return true;

    if (Boolean(editingTag.isCommunity) !== Boolean(originalTag.isCommunity)) return true;

    if (String(editingTag.description || '') !== String(originalTag.description || '')) return true;
    if (String(editingTag.wilsonZ ?? '') !== String(originalTag.wilsonZ ?? '')) return true;
    if (String(editingTag.scoreOn ?? '') !== String(originalTag.scoreOn ?? '')) return true;
    if (String(editingTag.scoreOff ?? '') !== String(originalTag.scoreOff ?? '')) return true;
    if (String(editingTag.scoringMode || '') !== String(originalTag.scoringMode || '')) return true;
    if (requireTopPlayFormValue(editingTag.requireTopPlay) !== requireTopPlayFormValue(originalTag.requireTopPlay)) return true;
    if (!sameBandSelection(editingTag.allowedBands, originalTag.allowedBands)) return true;
    
    // Check if icon was changed
    // New file uploaded
    if (editingTag.iconFile) return true;
    
    // Icon removed (explicitly set to null when it wasn't null before)
    if (editingTag.icon === null && originalTag.icon !== null) return true;
    
    // If icon is a blob URL (preview), it means a new file was selected
    // We don't need to compare URLs since blob URLs are temporary previews
    // The presence of iconFile or explicit null is already checked above
    
    return false;
  };

  // Handle closing the edit tag modal with confirmation if needed
  const handleCloseEditTag = () => {
    if (hasUnsavedChanges()) {
      const confirmed = window.confirm(t('difficulty.tags.edit.unsavedChanges'));
      if (!confirmed) return;
    }
    
    // Clean up preview URL if it was a blob URL
    if (editingTag?.icon && editingTag.icon.startsWith('blob:')) {
      URL.revokeObjectURL(editingTag.icon);
    }
    setEditingTag(null);
    setOriginalTag(null);
  };

  const handleDeleteTag = async () => {
    const tagId = deletingTag.id;
    try {
      await toast.promise(
        (async () => {
          await api.delete(`${routes.database.difficulties.root()}/tags/${tagId}`, {
            headers: {
              'X-Super-Admin-Password': verifiedPassword,
            },
          });
          setTags((prev) => prev.filter((tag) => tag.id !== tagId));
          setDeletingTag(null);
          await fetchTags();
        })(),
        {
          loading: t('difficulty.loading.deletingTag'),
          success: t('difficulty.tags.notifications.deleted'),
          error: (err) =>
            getRateLimitMessage(err) ||
            getCdnErrorMessage(err, t('difficulty.tags.notifications.deleteFailed')),
        },
      );
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };


  const anyModalOpen = useMemo(
    () =>
      isCreating ||
      editingDifficulty !== null ||
      deletingDifficulty !== null ||
      showPasswordPrompt ||
      showInitialPasswordPrompt ||
      isCreatingTag ||
      editingTag !== null ||
      deletingTag !== null ||
      isCreatingGroup ||
      editingGroup !== null ||
      deletingGroup !== null ||
      showDiscordRolesPopup,
    [
      isCreating,
      editingDifficulty,
      deletingDifficulty,
      showPasswordPrompt,
      showInitialPasswordPrompt,
      isCreatingTag,
      editingTag,
      deletingTag,
      isCreatingGroup,
      editingGroup,
      deletingGroup,
      showDiscordRolesPopup,
    ]
  );

  useEffect(() => {
    setIsAnyPopupOpen(anyModalOpen);
  }, [anyModalOpen]);

  useBodyScrollLock(anyModalOpen);

  // Initial password verification
  useEffect(() => {
    if (hasFlag(user, permissionFlags.SUPER_ADMIN) && showInitialPasswordPrompt) {
      // Show initial password prompt
      setShowInitialPasswordPrompt(true);
    }
  }, [user]);

  const handlePasswordSubmit = async (actionOverride) => {
    const action = actionOverride ?? selectedAction;
    const { type, data } = action;
    if (!type || !data) return;

    setError('');
    const loadingMessage =
      type === 'delete' ? t('difficulty.loading.deleting') : t('difficulty.loading.savingDifficulty');

    try {
      await toast.promise(
        (async () => {
          if (type === 'create') {
            const response = await api.post(`${routes.database.difficulties.root()}`, {
              ...data,
              superAdminPassword: verifiedPassword,
            });
            const created = response.data;
            setDifficulties((prev) => [...prev, created]);
            return 'create';
          }
          if (type === 'edit') {
            const response = await api.put(`${routes.database.difficulties.root()}/${data.id}`, {
              ...data,
              superAdminPassword: verifiedPassword,
            });
            const updatedDifficulty = response.data;
            setDifficulties((prev) =>
              prev.map((diff) => (diff.id === updatedDifficulty.id ? updatedDifficulty : diff)),
            );
            return 'edit';
          }
          if (type === 'delete') {
            await api.delete(
              `${routes.database.difficulties.root()}/${data.id}?fallbackId=${difficulties.find((d) => d.name === data.fallbackDiff)?.id}`,
              { data: { superAdminPassword: verifiedPassword } },
            );
            setDifficulties((prev) => prev.filter((diff) => diff.id !== data.id));
            return 'delete';
          }
          throw new Error('Unknown action');
        })(),
        {
          loading: loadingMessage,
          success: (result) => {
            if (result === 'create') return t('difficulty.notifications.created');
            if (result === 'edit') return t('difficulty.notifications.updated');
            return t('difficulty.notifications.deleted');
          },
          error: (err) =>
            err.response?.status === 403
              ? t('difficulty.passwordModal.errors.invalid')
              : t('difficulty.passwordModal.errors.generic'),
        },
      );

      setSuperAdminPassword('');
      setSelectedAction({ type: '', data: null });
      setError('');
      setIsCreating(false);
      setEditingDifficulty(null);
      setDeletingDifficulty(null);
      setShowDeleteInput(false);
      setFallbackDiff('');

      setNewDifficulty({
        id: '',
        name: '',
        type: 'PGU',
        icon: '',
        emoji: '',
        color: '#ffffff',
        baseScore: 0,
        legacy: '',
        legacyIcon: '',
        legacyEmoji: '',
      });
    } catch (err) {
      if (toastIfRateLimited(err)) {
        setError(getRateLimitMessage(err) || t('difficulty.passwordModal.errors.generic'));
        return;
      }
      const errorMessage =
        err?.response?.status === 403
          ? t('difficulty.passwordModal.errors.invalid')
          : t('difficulty.passwordModal.errors.generic');
      setError(errorMessage);
    }
  };

  const handleCloseCreateModal = () => {
    setIsCreating(false);
    setError('');
    setNewDifficulty({
      id: '',
      name: '',
      type: 'PGU',
      icon: '',
      emoji: '',
      color: '#ffffff',
      baseScore: 0,
      legacy: '',
      legacyIcon: '',
      legacyEmoji: ''
    });
  };

  const handleCloseEditModal = () => {
    setEditingDifficulty(null);
    setError('');
  };

  const handleCloseDeleteModal = () => {
    setDeletingDifficulty(null);
    setShowDeleteInput(false);
    setFallbackDiff('');
    setError('');
  };

  const handleCreateDifficulty = async () => {
    try {
      const response = await api.post(`${routes.database.difficulties.root()}`, {
        ...newDifficulty,
        superAdminPassword: verifiedPassword
      });
      return response.data;
    } catch (err) {
      throw err;
    }
  };

  const handleUpdateDifficulty = async (difficulty) => {
    try {
      const response = await api.put(`${routes.database.difficulties.root()}/${difficulty.id}`, {
        ...difficulty,
        superAdminPassword: verifiedPassword
      });
      return response.data;
    } catch (err) {
      throw err;
    }
  };

  const verifyPassword = async (password) => {
    try {
      await api.head(`${routes.admin.verifyPassword()}?origin=difficulty`, {
        headers: {
          'X-Super-Admin-Password': password
        }
      });
      setVerifiedPassword(password);
      setShowPasswordPrompt(false);
      setShowInitialPasswordPrompt(false);
      return true;
    } catch (error) {
      if (toastIfRateLimited(error)) {
        setError(getRateLimitMessage(error) || t('difficulty.passwordModal.errors.generic'));
        return false;
      }
      setError(t('difficulty.passwordModal.errors.invalid'));
      toast.error(t('difficulty.passwordModal.errors.invalid'));
      return false;
    }
  };

  const handleInitialPasswordSubmit = async () => {
    const isValid = await verifyPassword(superAdminPassword);
    if (isValid) {
      setSuperAdminPassword('');
    }
  };

  const handlePasswordPromptSubmit = async () => {
    const isValid = await verifyPassword(superAdminPassword);
    if (isValid) {
      const { type, data } = pendingAction;
      switch (type) {
        case 'edit':
          const rawDifficulty = difficulties.find(d => d.id === data.id);
          setEditingDifficulty(rawDifficulty);
          break;
        case 'create':
          setIsCreating(true);
          break;
        case 'delete':
          setDeletingDifficulty(data);
          break;
        case 'discordRoles':
          setShowDiscordRolesPopup(true);
          break;
      }
      setPendingAction(null);
    }
    setSuperAdminPassword('');
  };

  const handleEditClick = (difficulty) => {
    // Directly set the editing difficulty without showing password prompt
    setEditingDifficulty(difficulty);
  };

  const handleCreateClick = () => {
      setIsCreating(true);
  };


  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    setIsReordering(true);

    const items = Array.from(sortedDifficulties);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      sortOrder: index,
    }));

    setDifficulties(updatedItems);

    try {
      await toast.promise(
        api.put(
          `${routes.database.difficulties.root()}/sort-orders`,
          {
            sortOrders: updatedItems.map((item) => ({
              id: item.id,
              sortOrder: item.sortOrder,
            })),
          },
          {
            headers: {
              'X-Super-Admin-Password': verifiedPassword,
            },
          },
        ),
        {
          loading: t('difficulty.loading.reorderingDifficulties'),
          success: t('difficulty.notifications.reordered'),
          error: (err) =>
            getRateLimitMessage(err) || t('difficulty.notifications.reorderFailed'),
        },
      );
    } catch (err) {
      console.error('Error updating sort orders:', {
        error: err.message,
        status: err.response?.status,
        difficultyId: reorderedItem?.id,
        difficultyName: reorderedItem?.name,
      });
      await reloadDifficulties();
    } finally {
      setIsReordering(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const action = isCreating
      ? { type: 'create', data: newDifficulty }
      : { type: 'edit', data: editingDifficulty };
    setSelectedAction(action);
    void handlePasswordSubmit(action);
  };

  const handleTagDragEnd = async (result, groupName) => {
    if (!result.destination) return;
    // Only allow reordering within the same group (same droppableId)
    if (result.source.droppableId !== result.destination.droppableId) return;
    
    setIsTagsReordering(true);
    
    try {
      // Get tags for this specific group
      const groupTags = tags.filter(t => (t.group || '') === groupName);
      const sortedGroupTags = [...groupTags].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      
      const items = Array.from(sortedGroupTags);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      
      // Update sortOrder for items in this group only
      const updatedItems = items.map((item, index) => ({
        ...item,
        sortOrder: index
      }));
      
      // Update local state
      setTags(prev => prev.map(tag => {
        const updated = updatedItems.find(u => u.id === tag.id);
        return updated ? updated : tag;
      }));
      
      await toast.promise(
        api.put(
          `${routes.database.difficulties.root()}/tags/sort-orders`,
          {
            sortOrders: updatedItems.map((item) => ({
              id: item.id,
              sortOrder: item.sortOrder,
            })),
          },
          {
            headers: {
              'X-Super-Admin-Password': verifiedPassword,
            },
          },
        ),
        {
          loading: t('difficulty.loading.reorderingTags'),
          success: t('difficulty.tags.notifications.reordered'),
          error: (err) =>
            getRateLimitMessage(err) || t('difficulty.tags.notifications.reorderFailed'),
        },
      );
    } catch (err) {
      console.error('Error updating tag sort orders:', err);
      await fetchTags();
    } finally {
      setIsTagsReordering(false);
    }
  };

  const handleGroupDragEnd = async (result) => {
    if (!result.destination) return;
    
    setIsGroupsReordering(true);
    
    try {
      const items = Array.from(sortedNamedGroups);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      
      const groupUpdates = items.map((group, index) => ({
        id: group.id,
        name: group.name,
        sortOrder: index
      }));
      
      setTagGroups(items.map((group, index) => ({ ...group, sortOrder: index })));
      
      await toast.promise(
        api.put(
          `${routes.database.difficulties.root()}/tags/group-sort-orders`,
          { groups: groupUpdates },
          {
            headers: {
              'X-Super-Admin-Password': verifiedPassword,
            },
          },
        ),
        {
          loading: t('difficulty.loading.reorderingGroups'),
          success: t('difficulty.groups.notifications.reordered'),
          error: (err) =>
            getRateLimitMessage(err) || t('difficulty.groups.notifications.reorderFailed'),
        },
      );
    } catch (err) {
      console.error('Error updating group sort orders:', err);
      await fetchTags();
    } finally {
      setIsGroupsReordering(false);
    }
  };

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    try {
      await toast.promise(
        (async () => {
          await api.post(
            routes.database.difficulties.tagGroups(),
            { name },
            { headers: { 'X-Super-Admin-Password': verifiedPassword } },
          );
          setIsCreatingGroup(false);
          setNewGroupName('');
          await fetchTags();
        })(),
        {
          loading: t('difficulty.loading.savingGroup'),
          success: t('difficulty.groups.notifications.created'),
          error: (err) =>
            getRateLimitMessage(err) || t('difficulty.groups.notifications.createFailed'),
        },
      );
    } catch (error) {
      console.error('Error creating tag group:', error);
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;
    const name = String(editingGroup.name || '').trim();
    if (!name) return;
    try {
      await toast.promise(
        (async () => {
          const { requireTopPlay: _groupTopPlay, ...groupKnobs } = communityTagKnobsPayload(editingGroup);
          await api.put(
            routes.database.difficulties.tagGroup(editingGroup.id),
            { name, ...groupKnobs },
            { headers: { 'X-Super-Admin-Password': verifiedPassword } },
          );
          setEditingGroup(null);
          await fetchTags();
        })(),
        {
          loading: t('difficulty.loading.updatingGroup'),
          success: t('difficulty.groups.notifications.updated'),
          error: (err) =>
            getRateLimitMessage(err) || t('difficulty.groups.notifications.updateFailed'),
        },
      );
    } catch (error) {
      console.error('Error updating tag group:', error);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;
    const groupId = deletingGroup.id;
    try {
      await toast.promise(
        (async () => {
          await api.delete(routes.database.difficulties.tagGroup(groupId), {
            headers: { 'X-Super-Admin-Password': verifiedPassword },
          });
          setDeletingGroup(null);
          await fetchTags();
        })(),
        {
          loading: t('difficulty.loading.deletingGroup'),
          success: t('difficulty.groups.notifications.deleted'),
          error: (err) =>
            getRateLimitMessage(err) || t('difficulty.groups.notifications.deleteFailed'),
        },
      );
    } catch (error) {
      console.error('Error deleting tag group:', error);
    }
  };

  const sortedDifficulties = [...difficulties].sort((a, b) => a.sortOrder - b.sortOrder);

  const sortedNamedGroups = [...tagGroups].sort((a, b) => {
    const orderA = a.sortOrder ?? 0;
    const orderB = b.sortOrder ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  const tagsByGroupId = tags.reduce((acc, tag) => {
    const key = tag.groupId == null ? 'ungrouped' : String(tag.groupId);
    if (!acc[key]) acc[key] = [];
    acc[key].push(tag);
    return acc;
  }, {});

  const sortTagsInGroup = (list) =>
    [...(list || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const namedGroupSections = sortedNamedGroups.map((group) => ({
    id: group.id,
    name: group.name,
    groupSortOrder: group.sortOrder ?? 0,
    tags: sortTagsInGroup(tagsByGroupId[String(group.id)]),
  }));

  const ungroupedTags = sortTagsInGroup(tagsByGroupId.ungrouped);
  const orderedGroups = [
    ...namedGroupSections,
    ...(ungroupedTags.length
      ? [{ id: null, name: '', groupSortOrder: Number.MAX_SAFE_INTEGER, tags: ungroupedTags }]
      : []),
  ];

  const handleDirectDelete = async () => {
    if (!fallbackDiff || fallbackDiff === String(deletingDifficulty?.id)) return;
    const diffId = deletingDifficulty.id;
    try {
      setIsLoading(true);
      await toast.promise(
        (async () => {
          await api.delete(
            `${routes.database.difficulties.root()}/${diffId}?fallbackId=${difficulties.find((d) => d.name === fallbackDiff)?.id}`,
            { data: { superAdminPassword: verifiedPassword } },
          );
          setDifficulties((prev) => prev.filter((diff) => diff.id !== diffId));
          setDeletingDifficulty(null);
          setShowDeleteInput(false);
          setFallbackDiff('');
        })(),
        {
          loading: t('difficulty.loading.deleting'),
          success: t('difficulty.notifications.deleted'),
          error: (err) =>
            getRateLimitMessage(err) ||
            (err.response?.status === 403
              ? t('difficulty.passwordModal.errors.invalid')
              : t('difficulty.passwordModal.errors.generic')),
        },
      );
    } catch (err) {
      if (toastIfRateLimited(err)) {
        setError(getRateLimitMessage(err) || t('difficulty.passwordModal.errors.generic'));
      } else {
        setError(t('difficulty.passwordModal.errors.generic'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (user.permissionFlags === undefined) {
    return (
      <div className="difficulty-page">
        <MetaTags {...pageMeta} />
        
        <div className="difficulty-container page-content">
          <div className="loader-shell loader-shell--tall">
            <div className="loader loader-relative" />
          </div>
        </div>
      </div>
    );
  }

  if (!hasFlag(user, permissionFlags.SUPER_ADMIN)) {
    return (
      <AccessDenied 
        metaTitle={t('difficulty.meta.title')}
        metaDescription={t('difficulty.meta.description')}
      />
    );
  }

  return (
    <>
      <MetaTags {...pageMeta} />
      
      <div className="difficulty-page">
        {!isAnyPopupOpen && <ScrollButton />}
        <div className="difficulty-container page-content-1000">
          <div className="header-container">
            <h1>{t('difficulty.header.title')}</h1>
            <button
              className="refresh-button"
              onClick={activeTab === 'difficulties' ? reloadDifficulties : fetchTags}
              disabled={isLoading || contextLoading || isReordering || tagsLoading}
              aria-label={t('difficulty.header.refresh')}
            >
              <RefreshIcon color="#fff" size="36px" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'difficulties' ? 'active' : ''}`}
              onClick={() => setActiveTab('difficulties')}
            >
              {t('difficulty.tabs.difficulties')}
            </button>
            <button
              className={`tab-button ${activeTab === 'tags' ? 'active' : ''}`}
              onClick={() => setActiveTab('tags')}
            >
              {t('difficulty.tabs.tags')}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {activeTab === 'difficulties' ? (
            <>
              <div className="difficulty-actions-container">
                <button
                  className="create-button"
                  onClick={handleCreateClick}
                  disabled={isLoading || contextLoading || isReordering}
                >
                  {t('difficulty.buttons.create')}
                </button>
                <button
                  className="discord-roles-button"
                  onClick={() => {
                    if (!verifiedPassword) {
                      setPendingAction({ type: 'discordRoles' });
                      setShowPasswordPrompt(true);
                    } else {
                      setShowDiscordRolesPopup(true);
                    }
                  }}
                  disabled={isLoading || contextLoading || isReordering}
                >
                  {t('difficulty.buttons.discordRoles')}
                </button>
              </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="difficulties">
              {(provided) => (
                <div 
                  className="difficulties-list"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {isLoading || contextLoading ? (
                    <div className="loading-message">{t('difficulty.loading.difficulties')}</div>
                  ) : sortedDifficulties.length === 0 ? (
                    <div className="no-items-message">{t('difficulty.noItems.message')}</div>
                  ) : (
                    sortedDifficulties.map((difficulty, index) => (
                      <Draggable 
                        key={difficulty.id} 
                        draggableId={difficulty.id.toString()} 
                        index={index}
                        isDragDisabled={isReordering}
                      >
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`difficulty-item ${snapshot.isDragging ? 'dragging' : ''}`}
                          >
                            <div className="difficulty-info">
                              <img 
                                src={difficulty.icon} 
                                alt={difficulty.name} 
                                className="difficulty-icon"
                              />
                              <div className="difficulty-details">
                                <span className="difficulty-name">{difficulty.name}</span>
                                <span className="difficulty-type">{difficulty.type}</span>
                              </div>
                            </div>
                            <div className="difficulty-actions">
                              <button
                                className="edit-button"
                                onClick={() => handleEditClick(difficulty)}
                                disabled={isLoading || isReordering}
                              >
                                <EditIcon color="#fff" size="24px" />
                              </button>
                              <button
                                className="delete-button"
                                onClick={() => setDeletingDifficulty(difficulty)}
                                disabled={isLoading || isReordering}
                              >
                                <TrashIcon color="#fff" size="24px"/>
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
            </>
          ) : (
            <>
              {/* Sub-tab Navigation for Tags */}
              <div className="sub-tab-navigation">
                <button
                  className={`sub-tab-button ${tagsSubTab === 'tags' ? 'active' : ''}`}
                  onClick={() => setTagsSubTab('tags')}
                >
                  {t('difficulty.tabs.tags')}
                </button>
                <button
                  className={`sub-tab-button ${tagsSubTab === 'groups' ? 'active' : ''}`}
                  onClick={() => setTagsSubTab('groups')}
                >
                  {t('difficulty.tabs.groups')}
                </button>
              </div>

              {tagsSubTab === 'tags' ? (
                <>
                  <button
                    className="create-button"
                    onClick={() => setIsCreatingTag(true)}
                    disabled={tagsLoading || isTagsReordering}
                  >
                    {t('difficulty.tags.createButton')}
                  </button>

                  {tagsLoading ? (
                    <div className="loading-message">{t('loading.generic', { ns: 'common' })}</div>
                  ) : tags.length === 0 ? (
                    <div className="no-items-message">{t('difficulty.tags.noTags')}</div>
                  ) : (
                    <div className="grouped-tags-container">
                      {orderedGroups.map((group) => (
                        <div key={group.name || 'ungrouped'} className="tag-group-section">
                          <h3 className="tag-group-header">
                            {group.name || t('difficulty.tags.ungrouped')}
                            <span className="tag-count">({group.tags.length})</span>
                          </h3>
                          <DragDropContext onDragEnd={(result) => handleTagDragEnd(result, group.name)}>
                            <Droppable droppableId={`group-${group.name || 'ungrouped'}`}>
                              {(provided) => (
                                <div 
                                  className="tags-list"
                                  {...provided.droppableProps}
                                  ref={provided.innerRef}
                                >
                                  {group.tags.map((tag, index) => (
                                    <Draggable 
                                      key={tag.id} 
                                      draggableId={`tag-${tag.id}`} 
                                      index={index}
                                      isDragDisabled={isTagsReordering}
                                    >
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`tag-item ${snapshot.isDragging ? 'dragging' : ''}`}
                                        >
                                          <div className="tag-item-content">
                                            {tag.icon && (
                                              <img
                                                src={tag.icon}
                                                alt={tag.name}
                                                className="tag-item-icon"
                                              />
                                            )}
                                            <div className="tag-item-info">
                                              <div className="tag-item-name" style={{ color: tag.color }}>
                                                {tag.name}
                                              </div>
                                              <div className="tag-item-color">
                                                {tag.color}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="tag-item-actions">
                                            <button
                                              onClick={() => {
                                                setOriginalTag(withCommunityTagKnobs(tag));
                                                setEditingTag(withCommunityTagKnobs({
                                                  ...tag,
                                                  iconFile: null,
                                                  group: tag.group || '',
                                                }));
                                              }}
                                              disabled={isTagsReordering}
                                            >
                                              <EditIcon color="#fff" size="20px" />
                                            </button>
                                            <button
                                              onClick={() => setDeletingTag(tag)}
                                              disabled={isTagsReordering}
                                            >
                                              <TrashIcon color="#fff" size="20px" />
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </DragDropContext>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Groups Sub-tab */}
                  <button
                    className="create-button"
                    onClick={() => {
                      setNewGroupName('');
                      setIsCreatingGroup(true);
                    }}
                    disabled={tagsLoading || isGroupsReordering}
                  >
                    {t('difficulty.groups.createButton')}
                  </button>
                  {tagsLoading ? (
                    <div className="loading-message">{t('loading.generic', { ns: 'common' })}</div>
                  ) : sortedNamedGroups.length === 0 ? (
                    <div className="no-items-message">{t('difficulty.groups.noGroups')}</div>
                  ) : (
                    <DragDropContext onDragEnd={handleGroupDragEnd}>
                      <Droppable droppableId="groups">
                        {(provided) => (
                          <div 
                            className="groups-list"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                          >
                            {sortedNamedGroups.map((group, index) => (
                              <Draggable 
                                key={group.id} 
                                draggableId={`group-${group.id}`} 
                                index={index}
                                isDragDisabled={isGroupsReordering}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`group-item ${snapshot.isDragging ? 'dragging' : ''}`}
                                  >
                                    <div className="group-item-content">
                                      <div className="group-item-name">
                                        {group.name}
                                      </div>
                                      <div className="group-item-count">
                                        {t('difficulty.tags.tagCount', { count: (tagsByGroupId[String(group.id)] || []).length, plural: (tagsByGroupId[String(group.id)] || []).length !== 1 ? 's' : '' })}
                                      </div>
                                    </div>
                                    <div className="group-item-preview">
                                      {sortTagsInGroup(tagsByGroupId[String(group.id)]).slice(0, 5).map(tag => (
                                        <div
                                          key={tag.id}
                                          className="group-tag-preview"
                                          style={{
                                            backgroundColor: `${tag.color}40`,
                                            borderColor: tag.color
                                          }}
                                          title={tag.name}
                                        >
                                          {tag.icon ? (
                                            <img src={tag.icon} alt={tag.name} />
                                          ) : (
                                            <span>{tag.name.charAt(0)}</span>
                                          )}
                                        </div>
                                      ))}
                                      {(tagsByGroupId[String(group.id)] || []).length > 5 && (
                                        <span className="more-tags">+{(tagsByGroupId[String(group.id)] || []).length - 5}</span>
                                      )}
                                    </div>
                                    <div className="group-item-actions">
                                      <button
                                        type="button"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingGroup(withCommunityTagKnobs(group));
                                        }}
                                        disabled={isGroupsReordering}
                                      >
                                        <EditIcon color="#fff" size="20px" />
                                      </button>
                                      <button
                                        type="button"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingGroup(group);
                                        }}
                                        disabled={isGroupsReordering}
                                      >
                                        <TrashIcon color="#fff" size="20px" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  )}
                </>
              )}

              {/* Create Tag Modal */}
              {isCreatingTag && (
                <div
                  className="difficulty-modal"
                  onClick={(e) => {
                    if (e.target.className === 'difficulty-modal') {
                      // Clean up preview URL if exists
                      if (newTag.icon && newTag.icon.startsWith('blob:')) {
                        URL.revokeObjectURL(newTag.iconUrl);
                      }
                      setIsCreatingTag(false);
                      setNewTag(EMPTY_NEW_TAG);
                    }
                  }}
                >
                  <div className="difficulty-modal-content">
                    <CloseButton
                      variant="floating"
                      className="modal-close-button"
                      onClick={() => {
                        setIsCreatingTag(false);
                        setNewTag(EMPTY_NEW_TAG);
                      }}
                      aria-label={t('buttons.close', { ns: 'common' })}
                    />
                    <h2>{t('difficulty.tags.create.title')}</h2>
                    <form onSubmit={(e) => { e.preventDefault(); handleCreateTag(); }}>
                      <TagIconEditor
                        icon={newTag.icon}
                        i18nPrefix="difficulty.tags.create"
                        t={t}
                        onSelectFile={(file) => {
                          if (newTag.icon && newTag.icon.startsWith('blob:')) {
                            URL.revokeObjectURL(newTag.icon);
                          }
                          setNewTag({
                            ...newTag,
                            iconFile: file,
                            icon: URL.createObjectURL(file),
                          });
                        }}
                        onRemove={() => {
                          if (newTag.icon && newTag.icon.startsWith('blob:')) {
                            URL.revokeObjectURL(newTag.icon);
                          }
                          setNewTag({ ...newTag, iconFile: null, icon: null });
                        }}
                      />
                      <div className="form-group">
                        <label>{t('difficulty.tags.create.name')}</label>
                        <input
                          type="text"
                          value={newTag.name}
                          onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>{t('difficulty.tags.create.color')}</label>
                        <input
                          type="color"
                          value={newTag.color}
                          onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>{t('difficulty.tags.create.group.label')}</label>
                        <input
                          type="text"
                          value={newTag.group}
                          onChange={(e) => setNewTag({ ...newTag, group: e.target.value })}
                          placeholder={t('difficulty.tags.create.group.placeholder')}
                        />
                      </div>
                      <CommunityTagScoringFields
                        value={newTag}
                        onChange={setNewTag}
                        t={t}
                        includeDescription
                        includeAssignment={false}
                      />
                      <div className="form-group form-group--checkbox">
                        <label>
                          <input
                            type="checkbox"
                            checked={Boolean(newTag.isCommunity)}
                            onChange={(e) => setNewTag({ ...newTag, isCommunity: e.target.checked })}
                          />
                          <span>{t('difficulty.tags.create.isCommunity')}</span>
                        </label>
                      </div>
                      <div className="form-section-split">
                        <span className="form-section-split-label">
                          {t('difficulty.tags.fields.assignmentSection')}
                        </span>
                      </div>
                      <CommunityTagScoringFields
                        value={newTag}
                        onChange={setNewTag}
                        t={t}
                        inheritFromGroup
                        tagGroups={tagGroups}
                        inactive={!newTag.isCommunity}
                      />
                      <div className="modal-actions">
                        <button type="submit" className="confirm-button">{t('difficulty.tags.create.createButton')}</button>
                        <button
                          type="button"
                          className="cancel-button"
                          onClick={() => {
                            // Clean up preview URL if exists
                            if (newTag.icon && newTag.icon.startsWith('blob:')) {
                              URL.revokeObjectURL(newTag.icon);
                            }
                            setIsCreatingTag(false);
                            setNewTag(EMPTY_NEW_TAG);
                          }}
                        >
                          {t('buttons.cancel', { ns: 'common' })}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Edit Tag Modal */}
              {editingTag && (
                <div
                  className="difficulty-modal"
                  onClick={(e) => {
                    if (e.target.className === 'difficulty-modal') {
                      handleCloseEditTag();
                    }
                  }}
                >
                  <div className="difficulty-modal-content">
                    <CloseButton
                      variant="floating"
                      className="modal-close-button"
                      onClick={handleCloseEditTag}
                      aria-label={t('buttons.close', { ns: 'common' })}
                    />
                    <h2>{t('difficulty.tags.edit.title')}</h2>
                    <form onSubmit={(e) => { e.preventDefault(); handleUpdateTag(); }}>
                      <TagIconEditor
                        icon={editingTag.icon}
                        i18nPrefix="difficulty.tags.edit"
                        t={t}
                        onSelectFile={(file) => {
                          if (editingTag.icon && editingTag.icon.startsWith('blob:')) {
                            URL.revokeObjectURL(editingTag.icon);
                          }
                          setEditingTag({
                            ...editingTag,
                            iconFile: file,
                            icon: URL.createObjectURL(file),
                          });
                        }}
                        onRemove={() => {
                          if (editingTag.icon && editingTag.icon.startsWith('blob:')) {
                            URL.revokeObjectURL(editingTag.icon);
                          }
                          setEditingTag({ ...editingTag, iconFile: null, icon: null });
                        }}
                      />
                      <div className="form-group">
                        <label>{t('difficulty.tags.edit.name')}</label>
                        <input
                          type="text"
                          value={editingTag.name}
                          onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>{t('difficulty.tags.edit.color')}</label>
                        <input
                          type="color"
                          value={editingTag.color}
                          onChange={(e) => setEditingTag({ ...editingTag, color: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>{t('difficulty.tags.edit.group.label')}</label>
                        <input
                          type="text"
                          value={editingTag.group || ''}
                          onChange={(e) => setEditingTag({ ...editingTag, group: e.target.value })}
                          placeholder={t('difficulty.tags.edit.group.placeholder')}
                        />
                      </div>
                      <CommunityTagScoringFields
                        value={editingTag}
                        onChange={setEditingTag}
                        t={t}
                        includeDescription
                        includeAssignment={false}
                      />
                      <div className="form-group form-group--checkbox">
                        <label>
                          <input
                            type="checkbox"
                            checked={Boolean(editingTag.isCommunity)}
                            onChange={(e) => setEditingTag({ ...editingTag, isCommunity: e.target.checked })}
                          />
                          <span>{t('difficulty.tags.edit.isCommunity')}</span>
                        </label>
                      </div>
                      <div className="form-section-split">
                        <span className="form-section-split-label">
                          {t('difficulty.tags.fields.assignmentSection')}
                        </span>
                      </div>
                      <CommunityTagScoringFields
                        value={editingTag}
                        onChange={setEditingTag}
                        t={t}
                        inheritFromGroup
                        tagGroups={tagGroups}
                        inactive={!editingTag.isCommunity}
                      />
                      <div className="modal-actions">
                        <button type="submit" className="confirm-button">{t('difficulty.tags.edit.updateButton')}</button>
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={handleCloseEditTag}
                      >
                          {t('buttons.cancel', { ns: 'common' })}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Delete Tag Confirmation */}
              {deletingTag && (
                <div
                  className="difficulty-modal"
                  onClick={(e) => {
                    if (e.target.className === 'difficulty-modal') {
                      setDeletingTag(null);
                    }
                  }}
                >
                  <div className="difficulty-modal-content">
                    <CloseButton
                      variant="floating"
                      className="modal-close-button"
                      onClick={() => setDeletingTag(null)}
                      aria-label={t('buttons.close', { ns: 'common' })}
                    />
                    <h2>{t('difficulty.tags.delete.title')}</h2>
                    <p>{t('difficulty.tags.delete.message', { name: deletingTag.name })}</p>
                    <p>
                      {t('difficulty.tags.delete.description')}
                    </p>
                    <div className="modal-actions">
                      <button
                        type="button"
                        className="delete-confirm-button"
                        onClick={handleDeleteTag}
                      >
                        {t('difficulty.tags.delete.deleteButton')}
                      </button>
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => setDeletingTag(null)}
                      >
                        {t('buttons.cancel', { ns: 'common' })}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isCreatingGroup && (
                <div
                  className="difficulty-modal"
                  onClick={(e) => {
                    if (e.target.className === 'difficulty-modal') {
                      setIsCreatingGroup(false);
                      setNewGroupName('');
                    }
                  }}
                >
                  <div className="difficulty-modal-content">
                    <CloseButton
                      variant="floating"
                      className="modal-close-button"
                      onClick={() => {
                        setIsCreatingGroup(false);
                        setNewGroupName('');
                      }}
                      aria-label={t('buttons.close', { ns: 'common' })}
                    />
                    <h2>{t('difficulty.groups.create.title')}</h2>
                    <form onSubmit={(e) => { e.preventDefault(); handleCreateGroup(); }}>
                      <div className="form-group">
                        <label>{t('difficulty.groups.create.name')}</label>
                        <input
                          type="text"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="modal-actions">
                        <button type="submit" className="confirm-button">{t('difficulty.groups.create.createButton')}</button>
                        <button
                          type="button"
                          className="cancel-button"
                          onClick={() => {
                            setIsCreatingGroup(false);
                            setNewGroupName('');
                          }}
                        >
                          {t('buttons.cancel', { ns: 'common' })}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {editingGroup && (
                <div
                  className="difficulty-modal"
                  onClick={(e) => {
                    if (e.target.className === 'difficulty-modal') {
                      setEditingGroup(null);
                    }
                  }}
                >
                  <div className="difficulty-modal-content">
                    <CloseButton
                      variant="floating"
                      className="modal-close-button"
                      onClick={() => setEditingGroup(null)}
                      aria-label={t('buttons.close', { ns: 'common' })}
                    />
                    <h2>{t('difficulty.groups.edit.title')}</h2>
                    <form onSubmit={(e) => { e.preventDefault(); handleUpdateGroup(); }}>
                      <div className="form-group">
                        <label>{t('difficulty.groups.edit.name')}</label>
                        <input
                          type="text"
                          value={editingGroup.name}
                          onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                          required
                        />
                      </div>
                      <CommunityTagScoringFields
                        value={editingGroup}
                        onChange={setEditingGroup}
                        t={t}
                        includeRequireTopPlay={false}
                      />
                      <div className="modal-actions">
                        <button type="submit" className="confirm-button">{t('difficulty.groups.edit.updateButton')}</button>
                        <button
                          type="button"
                          className="cancel-button"
                          onClick={() => setEditingGroup(null)}
                        >
                          {t('buttons.cancel', { ns: 'common' })}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {deletingGroup && (
                <div
                  className="difficulty-modal"
                  onClick={(e) => {
                    if (e.target.className === 'difficulty-modal') {
                      setDeletingGroup(null);
                    }
                  }}
                >
                  <div className="difficulty-modal-content">
                    <CloseButton
                      variant="floating"
                      className="modal-close-button"
                      onClick={() => setDeletingGroup(null)}
                      aria-label={t('buttons.close', { ns: 'common' })}
                    />
                    <h2>{t('difficulty.groups.delete.title')}</h2>
                    <p>{t('difficulty.groups.delete.message', { name: deletingGroup.name })}</p>
                    <p>{t('difficulty.groups.delete.description')}</p>
                    <div className="modal-actions">
                      <button
                        type="button"
                        className="delete-confirm-button"
                        onClick={handleDeleteGroup}
                      >
                        {t('difficulty.groups.delete.deleteButton')}
                      </button>
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => setDeletingGroup(null)}
                      >
                        {t('buttons.cancel', { ns: 'common' })}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {deletingDifficulty && (
            <div 
              className="difficulty-modal"
              onClick={(e) => {
                if (e.target.className === 'difficulty-modal') {
                  handleCloseDeleteModal();
                }
              }}
            >
              <div className="difficulty-modal-content delete-modal">
                <CloseButton
                  variant="floating"
                  className="modal-close-button"
                  onClick={handleCloseDeleteModal}
                  aria-label={t('buttons.close', { ns: 'common' })}
                />

                <div className={`delete-warning ${showDeleteInput ? 'fade-out' : ''}`}>
                  <h2>{t('difficulty.modal.delete.warning.title')}</h2>
                  <div className="warning-content">
                    <p>{t('difficulty.modal.delete.warning.message', { name: deletingDifficulty?.name })}</p>
                    <p>{t('difficulty.modal.delete.warning.description')}</p>
                    <ul>
                      {t('difficulty.modal.delete.warning.points', { returnObjects: true }).map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                    <p className="warning-highlight">{t('difficulty.modal.delete.warning.highlight')}</p>
                  </div>
                  <button 
                    className="understand-button"
                    onClick={() => setShowDeleteInput(true)}
                  >
                    {t('difficulty.buttons.understand')}
                  </button>
                </div>

                <div className={`delete-input ${showDeleteInput ? 'fade-in' : ''}`}>
                  <h2>{t('difficulty.modal.delete.title')}</h2>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (fallbackDiff) {
                      setSelectedAction({ 
                        type: 'delete', 
                        data: { 
                          id: deletingDifficulty.id, 
                          fallbackDiff 
                        } 
                      });
                    }
                  }}>
                    <div className="form-group">
                      <label>{t('difficulty.form.labels.fallbackDiff')}</label>
                      <RatingInput
                        value={fallbackDiff || ''}
                        onChange={(val) => setFallbackDiff(val || '')}
                        showDiff={true}
                        difficulties={difficulties.filter(d => d.id !== deletingDifficulty?.id)}
                        allowCustomInput={false}
                        placeholder={t('difficulty.form.placeholders.fallbackDiff')}
                      />
                      <p className="help-text">
                        {t('difficulty.form.helpText.fallbackDiff', { name: deletingDifficulty?.name })}
                      </p>
                    </div>
                    <div className="modal-actions">
                      <button type="button" className="delete-confirm-button" onClick={handleDirectDelete} disabled={!fallbackDiff || fallbackDiff === String(deletingDifficulty?.id) || isLoading}>
                        {isLoading ? t('difficulty.loading.deleting') || 'Deleting...' : t('buttons.delete', { ns: 'common' })}
                      </button>
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={handleCloseDeleteModal}
                      >
                        {t('buttons.cancel', { ns: 'common' })}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {showPasswordPrompt && (
            <div className="password-modal">
              <div className="password-modal-content">
                <h3>{t('difficulty.passwordModal.title')}</h3>
                <p>{t('difficulty.passwordModal.message', { action: pendingAction?.type })}</p>
                <input
                  type="password"
                  autoComplete='section-password-super-admin'
                  value={superAdminPassword}
                  onChange={(e) => setSuperAdminPassword(e.target.value)}
                  placeholder={t('difficulty.passwordModal.placeholder')}
                />
                {error && <p className="error-message">{error}</p>}
                <div className="password-modal-actions">
                  <button 
                    className="confirm-btn btn-fill-primary"
                    onClick={handlePasswordPromptSubmit}
                    disabled={!superAdminPassword}
                  >
                    {t('buttons.confirm', { ns: 'common' })}
                  </button>
                  <button 
                    className="cancel-btn btn-fill-neutral-dark"
                    onClick={() => {
                      setShowPasswordPrompt(false);
                      setSuperAdminPassword('');
                      setPendingAction(null);
                    }}
                  >
                    {t('buttons.cancel', { ns: 'common' })}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showInitialPasswordPrompt && (
            <div className="password-modal">
              <div className="password-modal-content">
                <h3>{t('difficulty.passwordModal.initialTitle')}</h3>
                <p>{t('difficulty.passwordModal.initialMessage')}</p>
                <input
                  type="password"
                  autoComplete='section-password-super-admin'
                  value={superAdminPassword}
                  onChange={(e) => setSuperAdminPassword(e.target.value)}
                  placeholder={t('difficulty.passwordModal.placeholder')}
                />
                {error && <p className="error-message">{error}</p>}
                <div className="password-modal-actions">
                  <button 
                    className="confirm-btn btn-fill-primary"
                    onClick={handleInitialPasswordSubmit}
                    disabled={!superAdminPassword}
                  >
                    {t('buttons.confirm', { ns: 'common' })}
                  </button>
                </div>
              </div>
            </div>
          )}

          <DifficultyPopup
            isOpen={isCreating || editingDifficulty !== null}
            onClose={() => {
              if (isCreating) {
                handleCloseCreateModal();
              } else {
                handleCloseEditModal();
              }
            }}
            isCreating={isCreating}
            difficulty={isCreating ? newDifficulty : editingDifficulty || {}}
            onSubmit={handleFormSubmit}
            onChange={(updatedDifficulty) => {
              if (isCreating) {
                setNewDifficulty(updatedDifficulty);
              } else {
                setEditingDifficulty(updatedDifficulty);
              }
            }}
            refreshDifficulties={(updatedDifficulty) => {
              // Update only the changed difficulty instead of full refresh
              if (updatedDifficulty) {
                if (isCreating) {
                  setDifficulties(prev => [...prev, updatedDifficulty]);
                } else {
                  setDifficulties(prev => prev.map(diff => diff.id === updatedDifficulty.id ? updatedDifficulty : diff));
                }
              } else {
                // Fallback to full refresh only if no updated difficulty provided
                reloadDifficulties();
              }
            }}
            error={error}
            verifiedPassword={verifiedPassword}
          />

          <DiscordRolesPopup
            isOpen={showDiscordRolesPopup}
            onClose={() => setShowDiscordRolesPopup(false)}
            roleType="DIFFICULTY"
            verifiedPassword={verifiedPassword}
          />
        </div>
      </div>
    </>
  );
};

export default DifficultyPage; 