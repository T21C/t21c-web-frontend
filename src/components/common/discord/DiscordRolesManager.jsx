import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import { TrashIcon, EditIcon } from '@/components/common/icons';
import { RatingInput, CustomSelect } from '@/components/common/selectors';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
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
    { value: '', label: t('discordRoles.role.form.selectCurationType') },
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
  
  // Reordering state per guild
  const [reorderingGuilds, setReorderingGuilds] = useState({});

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
        t('discordRoles.confirmClose.message') || 'You have unsaved changes. Are you sure you want to close?'
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
        t('discordRoles.confirmClose.message') || 'You have unsaved changes. Are you sure you want to close?'
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
      setError(t('discordRoles.errors.loadGuilds'));
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
      toast.success(t('discordRoles.success.guildCreated'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('discordRoles.errors.createGuild'));
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
      toast.success(t('discordRoles.success.guildUpdated'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('discordRoles.errors.updateGuild'));
    }
  };

  const handleDeleteGuild = async (guildId) => {
    if (!confirm(t('discordRoles.guild.confirmDelete'))) return;
    
    try {
      await api.delete(`/v2/admin/discord/guilds/${guildId}`, {
        headers: getHeaders()
      });
      setGuilds(guilds.filter(g => g.id !== guildId));
      toast.success(t('discordRoles.success.guildDeleted'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('discordRoles.errors.deleteGuild'));
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
      toast.success(t('discordRoles.success.roleUpdated'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('discordRoles.errors.updateRole'));
    }
  };

  const handleDeleteRole = async () => {
    if (!confirm(t('discordRoles.role.confirmDelete'))) return;
    
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
      toast.success(t('discordRoles.success.roleDeleted'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('discordRoles.errors.deleteRole'));
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

  const handleRoleDragEnd = async (result, guildId) => {
    if (!result.destination) return;
    
    // Only allow reordering within the same guild (same droppableId)
    if (result.source.droppableId !== result.destination.droppableId) return;
    
    setReorderingGuilds(prev => ({ ...prev, [guildId]: true }));
    
    try {
      const guild = guilds.find(g => g.id === guildId);
      if (!guild || !guild.roles) {
        return;
      }

      const relevantRoles = getRelevantRoles(guild.roles);
      // Sort by sortOrder to get current order
      const sortedRoles = [...relevantRoles].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      
      // Reorder the array
      const items = Array.from(sortedRoles);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      
      // Extract IDs in the new order - these are the relevant role IDs
      const roleIds = items.map(item => item.id);
      
      // Update local state immediately for better UX
      // Only update sortOrder for roles that are in the reordered list
      setGuilds(guilds.map(g => {
        if (g.id === guildId) {
          const updatedRoles = g.roles.map(role => {
            const newIndex = roleIds.indexOf(role.id);
            if (newIndex !== -1) {
              // This role is in the reordered list, update its sortOrder
              return { ...role, sortOrder: newIndex };
            }
            // Keep other roles unchanged
            return role;
          });
          return { ...g, roles: updatedRoles };
        }
        return g;
      }));
      
      // Send reorder request to backend with the sorted list of IDs
      await api.put(`/v2/admin/discord/guilds/${guildId}/roles/reorder`, {
        roleIds: roleIds
      }, {
        headers: getHeaders()
      });
      
      // Reload guilds to get updated sortOrder values from backend
      await loadGuilds();
      
      toast.success(t('discordRoles.success.rolesReordered'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('discordRoles.errors.reorderRoles'));
      // Reload guilds on error to restore original order
      loadGuilds();
    } finally {
      setReorderingGuilds(prev => ({ ...prev, [guildId]: false }));
    }
  };

  if (isLoading) {
    return <div className="discord-roles-manager__loading">{t('loading.generic', { ns: 'common' })}</div>;
  }

  if (error) {
    return <div className="discord-roles-manager__error">{error}</div>;
  }

  const roleTypeLabel = roleType === 'DIFFICULTY' ? t('discordRoles.types.difficulty') : t('discordRoles.types.curation');

  return (
    <div className="discord-roles-manager">
      <div className="discord-roles-manager__header">
        <h3 className="discord-roles-manager__title">{t('discordRoles.title')}</h3>
        <button
          type="button"
          className="discord-roles-manager__add-guild-btn"
          onClick={() => openGuildModal()}
        >
          + {t('discordRoles.guild.add')}
        </button>
      </div>

      {guilds.length === 0 ? (
        <div className="discord-roles-manager__empty">
          <p>{t('discordRoles.empty.noGuilds')}</p>
          <p>{t('discordRoles.empty.noGuildsHint')}</p>
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
                      {relevantRoles.length} {relevantRoles.length !== 1 ? t('discordRoles.guild.roleCountPlural', { count: relevantRoles.length }) : t('discordRoles.guild.roleCount', { count: relevantRoles.length })}
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
                      <span>{t('discordRoles.guild.rolesFor', { type: roleTypeLabel })}</span>
                      <button
                        type="button"
                        className="discord-roles-manager__add-role-btn"
                        onClick={() => openRoleModal(guild.id)}
                      >
                        + {t('discordRoles.role.add')}
                      </button>
                    </div>

                    {relevantRoles.length === 0 ? (
                      <div className="discord-roles-manager__no-roles">
                        {t('discordRoles.empty.noRoles', { type: roleTypeLabel })}
                      </div>
                    ) : (
                      <DragDropContext onDragEnd={(result) => handleRoleDragEnd(result, guild.id)}>
                        <Droppable droppableId={`guild-${guild.id}`}>
                          {(provided) => {
                            // Sort roles by sortOrder before rendering
                            const sortedRoles = [...relevantRoles].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                            
                            return (
                              <div 
                                className="discord-roles-manager__roles-list"
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                              >
                                {sortedRoles.map((role, index) => (
                                  <Draggable
                                    key={role.id}
                                    draggableId={`role-${role.id}`}
                                    index={index}
                                    isDragDisabled={reorderingGuilds[guild.id]}
                                  >
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={`discord-roles-manager__role ${snapshot.isDragging ? 'dragging' : ''}`}
                                      >
                                        <div className="discord-roles-manager__role-info">
                                          <span className={`discord-roles-manager__role-status ${role.isActive ? 'active' : 'inactive'}`} />
                                          <span className="discord-roles-manager__role-label">{role.label}</span>
                                          <span className="discord-roles-manager__role-id">({role.roleId})</span>
                                          {role.conflictGroup && (
                                            <span className="discord-roles-manager__conflict-group">
                                              {t('discordRoles.role.group', { group: role.conflictGroup })}
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          className="discord-roles-manager__edit-btn"
                                          onClick={() => openRoleModal(guild.id, role)}
                                          disabled={reorderingGuilds[guild.id]}
                                        >
                                          <EditIcon size="14px" />
                                        </button>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            );
                          }}
                        </Droppable>
                      </DragDropContext>
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
            <h3>{editingGuild ? t('discordRoles.guild.edit') : t('discordRoles.guild.add')}</h3>
            <form onSubmit={(e) => { e.preventDefault(); editingGuild ? handleUpdateGuild() : handleCreateGuild(); }}>
              <div className="discord-roles-manager__form-group">
                <label>{t('discordRoles.guild.form.guildId')}</label>
                <input
                  type="text"
                  autoComplete='off'
                  value={guildForm.guildId}
                  onChange={(e) => setGuildForm({ ...guildForm, guildId: e.target.value })}
                  required
                  placeholder={t('discordRoles.guild.form.guildIdPlaceholder')}
                />
              </div>
              <div className="discord-roles-manager__form-group">
                <label>{t('discordRoles.guild.form.displayName')}</label>
                <input
                  type="text"
                  autoComplete='off'
                  value={guildForm.name}
                  onChange={(e) => setGuildForm({ ...guildForm, name: e.target.value })}
                  required
                  placeholder={t('discordRoles.guild.form.displayNamePlaceholder')}
                />
              </div>
              <div className="discord-roles-manager__form-group">
                <label>{t('discordRoles.guild.form.botToken')}</label>
                <input
                  type="password"
                  autoComplete='off'
                  value={guildForm.botToken}
                  onChange={(e) => setGuildForm({ ...guildForm, botToken: e.target.value })}
                  required={!editingGuild}
                  placeholder={editingGuild ? t('discordRoles.guild.form.botTokenPlaceholderEdit') : t('discordRoles.guild.form.botTokenPlaceholder')}
                />
                <p className="discord-roles-manager__hint">
                  {t('discordRoles.guild.form.botTokenHint')}
                </p>
              </div>
              <div className="discord-roles-manager__form-group discord-roles-manager__form-group--checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={guildForm.isActive}
                    onChange={(e) => setGuildForm({ ...guildForm, isActive: e.target.checked })}
                  />
                  {t('discordRoles.guild.form.active')}
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
            <h3>{editingRole ? t('discordRoles.role.edit') : t('discordRoles.role.add')}</h3>
            <form onSubmit={(e) => { e.preventDefault(); editingRole ? handleUpdateRole() : handleCreateRole(); }}>
              <div className="discord-roles-manager__form-group">
                <label>{t('discordRoles.role.form.roleId')}</label>
                <input
                  type="text"
                  autoComplete='off'
                  value={roleForm.roleId}
                  onChange={(e) => setRoleForm({ ...roleForm, roleId: e.target.value })}
                  required
                  placeholder={t('discordRoles.role.form.roleIdPlaceholder')}
                />
              </div>
              <div className="discord-roles-manager__form-group">
                <label>{t('discordRoles.role.form.label')}</label>
                <input
                  type="text"
                  autoComplete='off'
                  value={roleForm.label}
                  onChange={(e) => setRoleForm({ ...roleForm, label: e.target.value })}
                  required
                  placeholder={t('discordRoles.role.form.labelPlaceholder')}
                />
              </div>
              
              {roleType === 'DIFFICULTY' && (
                <div className="discord-roles-manager__form-group">
                  <label>{t('discordRoles.role.form.minimumDifficulty')}</label>
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
                    placeholder={t('discordRoles.role.form.selectDifficulty')}
                  />
                  <p className="discord-roles-manager__hint">
                    {t('discordRoles.role.form.difficultyHint')}
                  </p>
                </div>
              )}

              {roleType === 'CURATION' && (
                <div className="discord-roles-manager__form-group">
                  <CustomSelect
                    label={t('discordRoles.role.form.curationType')}
                    options={curationTypeOptions}
                    value={curationTypeOptions.find(opt => opt.value === (roleForm.curationTypeId ? roleForm.curationTypeId.toString() : ''))}
                    onChange={(selected) => setRoleForm({ ...roleForm, curationTypeId: selected.value ? parseInt(selected.value) : null })}
                    width="100%"
                  />
                  <p className="discord-roles-manager__hint">
                    {t('discordRoles.role.form.curationTypeHint')}
                  </p>
                </div>
              )}

              <div className="discord-roles-manager__form-group">
                <label>{t('discordRoles.role.form.conflictGroup')}</label>
                <input
                  type="text"
                  autoComplete='off'
                  value={roleForm.conflictGroup}
                  onChange={(e) => setRoleForm({ ...roleForm, conflictGroup: e.target.value })}
                  placeholder={t('discordRoles.role.form.conflictGroupPlaceholder')}
                />
                <p className="discord-roles-manager__hint">
                  {t('discordRoles.role.form.conflictGroupHint')}
                </p>
              </div>

              <div className="discord-roles-manager__form-group discord-roles-manager__form-group--checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={roleForm.isActive}
                    onChange={(e) => setRoleForm({ ...roleForm, isActive: e.target.checked })}
                  />
                  {t('discordRoles.role.form.active')}
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
