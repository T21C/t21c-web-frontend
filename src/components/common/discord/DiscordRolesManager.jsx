import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import { TrashIcon, EditIcon } from '@/components/common/icons';
import { RatingInput, CustomSelect } from '@/components/common/selectors';
import './discordrolesmanager.css';

/**
 * Discord Roles Manager Component
 * Manages Discord guilds and sync roles for difficulty or curation based role assignment
 * 
 * @param {Object} props
 * @param {'DIFFICULTY' | 'CURATION'} props.roleType - Type of roles to manage
 * @param {number} props.difficultyId - Required for DIFFICULTY type - the difficulty ID to filter roles by
 * @param {number} props.curationTypeId - Required for CURATION type - the curation type ID to filter roles by
 * @param {Array} props.difficulties - List of all difficulties (for DIFFICULTY type)
 * @param {Array} props.curationTypes - List of all curation types (for CURATION type)
 * @param {string} props.verifiedPassword - Verified super admin password for modification requests
 */
const DiscordRolesManager = ({
  roleType = 'DIFFICULTY',
  difficultyId = null,
  curationTypeId = null,
  difficulties = [],
  curationTypes = [],
  onUnsavedChangesChange,
  verifiedPassword = '',
}) => {
  const { t } = useTranslation(['components', 'common']);
  const tDisc = (key, params = {}) => t(`discordRoles.${key}`, params);

  // Prepare curation type options for CustomSelect
  const curationTypeOptions = useMemo(() => [
    { value: '', label: tDisc('role.form.selectCurationType') },
    ...curationTypes.map(type => ({
      value: type.id.toString(),
      label: type.name
    }))
  ], [curationTypes, tDisc]);

  const [guilds, setGuilds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Guild modal state
  const [showGuildModal, setShowGuildModal] = useState(false);
  const [editingGuild, setEditingGuild] = useState(null);
  const [guildForm, setGuildForm] = useState({
    guildId: '',
    name: '',
    botToken: '',
    isActive: true,
  });
  
  // Role modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedGuildId, setSelectedGuildId] = useState(null);
  const [roleForm, setRoleForm] = useState({
    roleId: '',
    label: '',
    type: roleType,
    minDifficultyId: difficultyId,
    curationTypeId: curationTypeId,
    conflictGroup: '',
    isActive: true,
  });

  // Expanded guilds state
  const [expandedGuilds, setExpandedGuilds] = useState({});

  // Track initial form states for unsaved changes detection
  const [initialGuildForm, setInitialGuildForm] = useState(null);
  const [initialRoleForm, setInitialRoleForm] = useState(null);

  useEffect(() => {    
    // Lock scrolling
    document.body.style.overflowY = 'hidden';

    // Cleanup function to restore original scroll state
    return () => {
      document.body.style.overflowY = '';
    };
  }, []);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = showGuildModal || showRoleModal;
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(hasChanges);
    }
  }, [showGuildModal, showRoleModal, onUnsavedChangesChange]);

  // Check if guild form has unsaved changes
  const hasGuildFormChanges = () => {
    if (!showGuildModal || !initialGuildForm) return false;
    
    return (
      guildForm.guildId !== initialGuildForm.guildId ||
      guildForm.name !== initialGuildForm.name ||
      (guildForm.botToken !== '••••••••' && guildForm.botToken !== initialGuildForm.botToken) ||
      guildForm.isActive !== initialGuildForm.isActive
    );
  };

  // Check if role form has unsaved changes
  const hasRoleFormChanges = () => {
    if (!showRoleModal || !initialRoleForm) return false;
    
    return (
      roleForm.roleId !== initialRoleForm.roleId ||
      roleForm.label !== initialRoleForm.label ||
      roleForm.minDifficultyId !== initialRoleForm.minDifficultyId ||
      roleForm.curationTypeId !== initialRoleForm.curationTypeId ||
      roleForm.conflictGroup !== initialRoleForm.conflictGroup ||
      roleForm.isActive !== initialRoleForm.isActive
    );
  };

  const handleCloseGuildModal = () => {
    if (hasGuildFormChanges()) {
      const confirmed = window.confirm(
        tDisc('confirmClose.message') || 'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmed) {
        return;
      }
    }
    setShowGuildModal(false);
    resetGuildForm();
  };

  const handleCloseRoleModal = () => {
    if (hasRoleFormChanges()) {
      const confirmed = window.confirm(
        tDisc('confirmClose.message') || 'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmed) {
        return;
      }
    }
    setShowRoleModal(false);
    resetRoleForm();
  };

  useEffect(() => {    
    // Lock scrolling when modals are open
    if (showGuildModal || showRoleModal) {
      document.body.style.overflowY = 'hidden';
    }

    // Cleanup function to restore original scroll state
    return () => {
      document.body.style.overflowY = '';
    };
  }, [showGuildModal, showRoleModal]);
  
  useEffect(() => {
    loadGuilds();
  }, []);

  const loadGuilds = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/v2/admin/discord/guilds');
      setGuilds(response.data || []);
      setError('');
    } catch (err) {
      setError(tDisc('errors.loadGuilds'));
      console.error('Error loading guilds:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGuildExpanded = (guildId) => {
    setExpandedGuilds(prev => ({
      ...prev,
      [guildId]: !prev[guildId]
    }));
  };

  // Filter roles for the current type and reference ID
  const getRelevantRoles = (roles) => {
    if (!roles) return [];
    return roles.filter(role => {
      if (role.type !== roleType) return false;
      if (roleType === 'DIFFICULTY' && difficultyId) {
        return role.minDifficultyId === difficultyId;
      }
      if (roleType === 'CURATION' && curationTypeId) {
        return role.curationTypeId === curationTypeId;
      }
      return true;
    });
  };

  // Helper function to build headers with password
  const getHeaders = () => {
    if (!verifiedPassword) return {};
    return {
      'X-Super-Admin-Password': verifiedPassword
    };
  };

  // Guild CRUD operations
  const handleCreateGuild = async () => {
    try {
      const response = await api.post('/v2/admin/discord/guilds', guildForm, {
        headers: getHeaders()
      });
      setGuilds([...guilds, response.data]);
      setShowGuildModal(false);
      resetGuildForm();
      setInitialGuildForm(null);
      toast.success(tDisc('success.guildCreated'));
    } catch (err) {
      toast.error(err.response?.data?.error || tDisc('errors.createGuild'));
    }
  };

  const handleUpdateGuild = async () => {
    try {
      const response = await api.put(`/v2/admin/discord/guilds/${editingGuild.id}`, guildForm, {
        headers: getHeaders()
      });
      // Merge response data with existing guild data to preserve roles array
      setGuilds(guilds.map(g => {
        if (g.id === editingGuild.id) {
          return {
            ...g,
            ...response.data,
            roles: g.roles || [], // Preserve existing roles array
          };
        }
        return g;
      }));
      setShowGuildModal(false);
      resetGuildForm();
      setInitialGuildForm(null);
      toast.success(tDisc('success.guildUpdated'));
    } catch (err) {
      toast.error(err.response?.data?.error || tDisc('errors.updateGuild'));
    }
  };

  const handleDeleteGuild = async (guildId) => {
    if (!confirm(tDisc('guild.confirmDelete'))) return;
    
    try {
      await api.delete(`/v2/admin/discord/guilds/${guildId}`, {
        headers: getHeaders()
      });
      setGuilds(guilds.filter(g => g.id !== guildId));
      toast.success(tDisc('success.guildDeleted'));
    } catch (err) {
      toast.error(err.response?.data?.error || tDisc('errors.deleteGuild'));
    }
  };

  const resetGuildForm = () => {
    setGuildForm({
      guildId: '',
      name: '',
      botToken: '',
      isActive: true,
    });
    setEditingGuild(null);
    setInitialGuildForm(null);
  };

  const openGuildModal = (guild = null) => {
    if (guild) {
      setEditingGuild(guild);
      const formData = {
        guildId: guild.guildId,
        name: guild.name,
        botToken: '••••••••',
        isActive: guild.isActive,
      };
      setGuildForm(formData);
      setInitialGuildForm({ ...formData });
    } else {
      const formData = {
        guildId: '',
        name: '',
        botToken: '',
        isActive: true,
      };
      setGuildForm(formData);
      setInitialGuildForm({ ...formData });
      setEditingGuild(null);
    }
    setShowGuildModal(true);
  };

  // Role CRUD operations
  const handleCreateRole = async () => {
    try {
      const payload = {
        ...roleForm,
        type: roleType,
        minDifficultyId: roleType === 'DIFFICULTY' ? (roleForm.minDifficultyId || difficultyId) : null,
        curationTypeId: roleType === 'CURATION' ? (roleForm.curationTypeId || curationTypeId) : null,
      };
      const response = await api.post(`/v2/admin/discord/guilds/${selectedGuildId}/roles`, payload, {
        headers: getHeaders()
      });
      
      // Update the guild's roles in state
      setGuilds(guilds.map(g => {
        if (g.id === selectedGuildId) {
          return {
            ...g,
            roles: [...(g.roles || []), response.data],
          };
        }
        return g;
      }));
      
      setShowRoleModal(false);
      resetRoleForm();
      toast.success('Role created successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create role');
    }
  };

  const handleUpdateRole = async () => {
    try {
      const payload = {
        ...roleForm,
        type: roleType,
        minDifficultyId: roleType === 'DIFFICULTY' ? roleForm.minDifficultyId : null,
        curationTypeId: roleType === 'CURATION' ? roleForm.curationTypeId : null,
      };
      const response = await api.put(`/v2/admin/discord/guilds/${selectedGuildId}/roles/${editingRole.id}`, payload, {
        headers: getHeaders()
      });
      
      // Update the role in state
      setGuilds(guilds.map(g => {
        if (g.id === selectedGuildId) {
          return {
            ...g,
            roles: g.roles.map(r => r.id === editingRole.id ? response.data : r),
          };
        }
        return g;
      }));
      
      setShowRoleModal(false);
      resetRoleForm();
      setInitialRoleForm(null);
      toast.success(tDisc('success.roleUpdated'));
    } catch (err) {
      toast.error(err.response?.data?.error || tDisc('errors.updateRole'));
    }
  };

  const handleDeleteRole = async () => {
    if (!confirm(tDisc('role.confirmDelete'))) return;
    
    try {
      await api.delete(`/v2/admin/discord/guilds/${selectedGuildId}/roles/${editingRole.id}`, {
        headers: getHeaders()
      });
      
      // Remove the role from state
      setGuilds(guilds.map(g => {
        if (g.id === selectedGuildId) {
          return {
            ...g,
            roles: g.roles.filter(r => r.id !== editingRole.id),
          };
        }
        return g;
      }));
      
      setShowRoleModal(false);
      resetRoleForm();
      toast.success(tDisc('success.roleDeleted'));
    } catch (err) {
      toast.error(err.response?.data?.error || tDisc('errors.deleteRole'));
    }
  };

  const resetRoleForm = () => {
    setRoleForm({
      roleId: '',
      label: '',
      type: roleType,
      minDifficultyId: difficultyId,
      curationTypeId: curationTypeId,
      conflictGroup: '',
      isActive: true,
    });
    setEditingRole(null);
    setSelectedGuildId(null);
    setInitialRoleForm(null);
  };

  const openRoleModal = (guildId, role = null) => {
    setSelectedGuildId(guildId);
    if (role) {
      setEditingRole(role);
      const formData = {
        roleId: role.roleId,
        label: role.label,
        type: role.type,
        minDifficultyId: role.minDifficultyId,
        curationTypeId: role.curationTypeId,
        conflictGroup: role.conflictGroup || '',
        isActive: role.isActive,
      };
      setRoleForm(formData);
      setInitialRoleForm({ ...formData });
    } else {
      const formData = {
        roleId: '',
        label: '',
        type: roleType,
        minDifficultyId: difficultyId,
        curationTypeId: curationTypeId,
        conflictGroup: '',
        isActive: true,
      };
      setRoleForm(formData);
      setInitialRoleForm({ ...formData });
      setEditingRole(null);
    }
    setShowRoleModal(true);
  };

  if (isLoading) {
    return <div className="discord-roles-manager__loading">{t('loading.generic', { ns: 'common' })}</div>;
  }

  if (error) {
    return <div className="discord-roles-manager__error">{error}</div>;
  }

  const roleTypeLabel = roleType === 'DIFFICULTY' ? tDisc('types.difficulty') : tDisc('types.curation');

  return (
    <div className="discord-roles-manager">
      <div className="discord-roles-manager__header">
        <h3 className="discord-roles-manager__title">{tDisc('title')}</h3>
        <button
          type="button"
          className="discord-roles-manager__add-guild-btn"
          onClick={() => openGuildModal()}
        >
          + {tDisc('guild.add')}
        </button>
      </div>

      {guilds.length === 0 ? (
        <div className="discord-roles-manager__empty">
          <p>{tDisc('empty.noGuilds')}</p>
          <p>{tDisc('empty.noGuildsHint')}</p>
        </div>
      ) : (
        <div className="discord-roles-manager__guilds">
          {guilds.map(guild => {
            const relevantRoles = getRelevantRoles(guild.roles);
            
            return (
              <div key={guild.id} className="discord-roles-manager__guild">
                <div 
                  className="discord-roles-manager__guild-header"
                  onClick={() => toggleGuildExpanded(guild.id)}
                >
                  <div className="discord-roles-manager__guild-info">
                    <span className={`discord-roles-manager__guild-status ${guild.isActive ? 'active' : 'inactive'}`} />
                    <span className="discord-roles-manager__guild-name">{guild.name}</span>
                    <span className="discord-roles-manager__guild-id">({guild.guildId})</span>
                    <span className="discord-roles-manager__role-count">
                      {relevantRoles.length} {relevantRoles.length !== 1 ? tDisc('guild.roleCountPlural', { count: relevantRoles.length }) : tDisc('guild.roleCount', { count: relevantRoles.length })}
                    </span>
                  </div>
                  <div className="discord-roles-manager__guild-actions">
                    <button
                      type="button"
                      className="discord-roles-manager__edit-btn"
                      onClick={(e) => { e.stopPropagation(); openGuildModal(guild); }}
                    >
                      <EditIcon size="16px" />
                    </button>
                    <button
                      type="button"
                      className="discord-roles-manager__delete-btn"
                      onClick={(e) => { e.stopPropagation(); handleDeleteGuild(guild.id); }}
                    >
                      <TrashIcon size="16px" color="#f55" />
                    </button>
                    <span className={`discord-roles-manager__expand-icon ${expandedGuilds[guild.id] ? 'expanded' : ''}`}>
                      ▼
                    </span>
                  </div>
                </div>

                {expandedGuilds[guild.id] && (
                  <div className="discord-roles-manager__guild-content">
                    <div className="discord-roles-manager__roles-header">
                      <span>{tDisc('guild.rolesFor', { type: roleTypeLabel })}</span>
                      <button
                        type="button"
                        className="discord-roles-manager__add-role-btn"
                        onClick={() => openRoleModal(guild.id)}
                      >
                        + {tDisc('role.add')}
                      </button>
                    </div>

                    {relevantRoles.length === 0 ? (
                      <div className="discord-roles-manager__no-roles">
                        {tDisc('empty.noRoles', { type: roleTypeLabel })}
                      </div>
                    ) : (
                      <div className="discord-roles-manager__roles-list">
                        {relevantRoles.map(role => (
                          <div key={role.id} className="discord-roles-manager__role">
                            <div className="discord-roles-manager__role-info">
                              <span className={`discord-roles-manager__role-status ${role.isActive ? 'active' : 'inactive'}`} />
                              <span className="discord-roles-manager__role-label">{role.label}</span>
                              <span className="discord-roles-manager__role-id">({role.roleId})</span>
                              {role.conflictGroup && (
                                <span className="discord-roles-manager__conflict-group">
                                  {tDisc('role.group', { group: role.conflictGroup })}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="discord-roles-manager__edit-btn"
                              onClick={() => openRoleModal(guild.id, role)}
                            >
                              <EditIcon size="14px" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Guild Modal */}
      {showGuildModal && (
        <div className="discord-roles-manager__modal-overlay" onClick={handleCloseGuildModal}>
          <div className="discord-roles-manager__modal" onClick={e => e.stopPropagation()}>
            <h3>{editingGuild ? tDisc('guild.edit') : tDisc('guild.add')}</h3>
            <form onSubmit={(e) => { e.preventDefault(); editingGuild ? handleUpdateGuild() : handleCreateGuild(); }}>
              <div className="discord-roles-manager__form-group">
                <label>{tDisc('guild.form.guildId')}</label>
                <input
                  type="text"
                  value={guildForm.guildId}
                  onChange={(e) => setGuildForm({ ...guildForm, guildId: e.target.value })}
                  required
                  placeholder={tDisc('guild.form.guildIdPlaceholder')}
                />
              </div>
              <div className="discord-roles-manager__form-group">
                <label>{tDisc('guild.form.displayName')}</label>
                <input
                  type="text"
                  value={guildForm.name}
                  onChange={(e) => setGuildForm({ ...guildForm, name: e.target.value })}
                  required
                  placeholder={tDisc('guild.form.displayNamePlaceholder')}
                />
              </div>
              <div className="discord-roles-manager__form-group">
                <label>{tDisc('guild.form.botToken')}</label>
                <input
                  type="password"
                  value={guildForm.botToken}
                  onChange={(e) => setGuildForm({ ...guildForm, botToken: e.target.value })}
                  required={!editingGuild}
                  placeholder={editingGuild ? tDisc('guild.form.botTokenPlaceholderEdit') : tDisc('guild.form.botTokenPlaceholder')}
                />
                <p className="discord-roles-manager__hint">
                  {tDisc('guild.form.botTokenHint')}
                </p>
              </div>
              <div className="discord-roles-manager__form-group discord-roles-manager__form-group--checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={guildForm.isActive}
                    onChange={(e) => setGuildForm({ ...guildForm, isActive: e.target.checked })}
                  />
                  {tDisc('guild.form.active')}
                </label>
              </div>
              <div className="discord-roles-manager__modal-actions">
                <button type="submit" className="discord-roles-manager__btn--primary">
                  {editingGuild ? t('buttons.save', { ns: 'common' }) : t('buttons.add', { ns: 'common' })}
                </button>
                {editingGuild && (
                  <button
                    type="button"
                    className="discord-roles-manager__btn--danger"
                    onClick={() => handleDeleteGuild(editingGuild.id)}
                  >
                    {t('buttons.delete', { ns: 'common' })}
                  </button>
                )}
                <button
                  type="button"
                  className="discord-roles-manager__btn--secondary"
                  onClick={handleCloseGuildModal}
                >
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div className="discord-roles-manager__modal-overlay" onClick={handleCloseRoleModal}>
          <div className="discord-roles-manager__modal" onClick={e => e.stopPropagation()}>
            <h3>{editingRole ? tDisc('role.edit') : tDisc('role.add')}</h3>
            <form onSubmit={(e) => { e.preventDefault(); editingRole ? handleUpdateRole() : handleCreateRole(); }}>
              <div className="discord-roles-manager__form-group">
                <label>{tDisc('role.form.roleId')}</label>
                <input
                  type="text"
                  value={roleForm.roleId}
                  onChange={(e) => setRoleForm({ ...roleForm, roleId: e.target.value })}
                  required
                  placeholder={tDisc('role.form.roleIdPlaceholder')}
                />
              </div>
              <div className="discord-roles-manager__form-group">
                <label>{tDisc('role.form.label')}</label>
                <input
                  type="text"
                  value={roleForm.label}
                  onChange={(e) => setRoleForm({ ...roleForm, label: e.target.value })}
                  required
                  placeholder={tDisc('role.form.labelPlaceholder')}
                />
              </div>
              
              {roleType === 'DIFFICULTY' && (
                <div className="discord-roles-manager__form-group">
                  <label>{tDisc('role.form.minimumDifficulty')}</label>
                  <RatingInput
                    value={roleForm.minDifficultyId ? difficulties.find(d => d.id === roleForm.minDifficultyId)?.name || '' : ''}
                    onChange={(difficultyName, isSelected) => {
                      if (isSelected && difficultyName) {
                        const selectedDifficulty = difficulties.find(d => d.name === difficultyName);
                        if (selectedDifficulty) {
                          setRoleForm({ ...roleForm, minDifficultyId: selectedDifficulty.id });
                        }
                      } else if (!difficultyName) {
                        setRoleForm({ ...roleForm, minDifficultyId: null });
                      }
                    }}
                    showDiff={true}
                    difficulties={difficulties}
                    diffId={roleForm.minDifficultyId || 0}
                    allowCustomInput={false}
                    placeholder={tDisc('role.form.selectDifficulty')}
                  />
                  <p className="discord-roles-manager__hint">
                    {tDisc('role.form.difficultyHint')}
                  </p>
                </div>
              )}

              {roleType === 'CURATION' && (
                <div className="discord-roles-manager__form-group">
                  <CustomSelect
                    label={tDisc('role.form.curationType')}
                    options={curationTypeOptions}
                    value={curationTypeOptions.find(opt => opt.value === (roleForm.curationTypeId ? roleForm.curationTypeId.toString() : ''))}
                    onChange={(selected) => setRoleForm({ ...roleForm, curationTypeId: selected.value ? parseInt(selected.value) : null })}
                    width="100%"
                  />
                  <p className="discord-roles-manager__hint">
                    {tDisc('role.form.curationTypeHint')}
                  </p>
                </div>
              )}

              <div className="discord-roles-manager__form-group">
                <label>{tDisc('role.form.conflictGroup')}</label>
                <input
                  type="text"
                  value={roleForm.conflictGroup}
                  onChange={(e) => setRoleForm({ ...roleForm, conflictGroup: e.target.value })}
                  placeholder={tDisc('role.form.conflictGroupPlaceholder')}
                />
                <p className="discord-roles-manager__hint">
                  {tDisc('role.form.conflictGroupHint')}
                </p>
              </div>

              <div className="discord-roles-manager__form-group discord-roles-manager__form-group--checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={roleForm.isActive}
                    onChange={(e) => setRoleForm({ ...roleForm, isActive: e.target.checked })}
                  />
                  {tDisc('role.form.active')}
                </label>
              </div>

              <div className="discord-roles-manager__modal-actions">
                <button type="submit" className="discord-roles-manager__btn--primary">
                  {editingRole ? t('buttons.save', { ns: 'common' }) : t('buttons.add', { ns: 'common' })}
                </button>
                {editingRole && (
                  <button
                    type="button"
                    className="discord-roles-manager__btn--danger"
                    onClick={handleDeleteRole}
                  >
                    {t('buttons.delete', { ns: 'common' })}
                  </button>
                )}
                <button
                  type="button"
                  className="discord-roles-manager__btn--secondary"
                  onClick={handleCloseRoleModal}
                >
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscordRolesManager;
