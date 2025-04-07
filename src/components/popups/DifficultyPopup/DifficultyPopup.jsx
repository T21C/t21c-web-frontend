import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { EditIcon, PencilIcon, QuestionmarkCircleIcon, TrashIcon } from '@/components/common/icons';
import { CustomSelect, StateDisplay } from '@/components/common/selectors';
import api from '@/utils/api';
import './difficultypopup.css';
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const DIRECTIVE_MODES = {
  STATIC: 'STATIC',
  CONDITIONAL: 'CONDITIONAL'
};

const TRIGGER_TYPES = {
  PASS: 'PASS',
  LEVEL: 'LEVEL'
};

const DifficultyPopup = ({
  isOpen,
  onClose,
  isCreating,
  difficulty,
  onSubmit,
  onChange,
  refreshDifficulties,
  error,
  verifiedPassword
}) => {
  const { t } = useTranslation('components');
  const tDiff = (key, params = {}) => t(`difficultyPopup.${key}`, params);
  const [activeTab, setActiveTab] = useState('details');
  const [directives, setDirectives] = useState([]);
  const [originalDirectives, setOriginalDirectives] = useState([]);
  const [directivesError, setDirectivesError] = useState('');
  const [isLoadingDirectives, setIsLoadingDirectives] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [pendingDirectives, setPendingDirectives] = useState(null);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelError, setChannelError] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [availableChannels, setAvailableChannels] = useState([]);
  const [roleError, setRoleError] = useState('');
  const [channelModalSource, setChannelModalSource] = useState('edit');
  const [roleModalSource, setRoleModalSource] = useState('edit');
  const [channelLabel, setChannelLabel] = useState('');
  const [channelWebhookUrl, setChannelWebhookUrl] = useState('');
  const [mouseDownOutside, setMouseDownOutside] = useState(false);
  const [pasteError, setPasteError] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [expandedDirectives, setExpandedDirectives] = useState({});
  const [expandedActions, setExpandedActions] = useState({});
  const modalRef = useRef(null);

  const handleMouseDown = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      setMouseDownOutside(true);
    }
  };

  const handleMouseUp = (e) => {
    if (mouseDownOutside && modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
    setMouseDownOutside(false);
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, mouseDownOutside]);

  useEffect(() => {
    if (isOpen && !isCreating) {
      loadDirectives();
      loadAvailableRoles();
      loadAvailableChannels();
    }
  }, [isOpen, isCreating]);

  const loadDirectives = async () => {
    if (!difficulty?.id) return;
    
    setIsLoadingDirectives(true);
    try {
      const response = await api.get(`${import.meta.env.VITE_DIFFICULTIES}/${difficulty.id}/directives`, {
        headers: {
          'X-Super-Admin-Password': verifiedPassword
        }
      });
      const loadedDirectives = response.data || [];
      
      if (loadedDirectives.length === 0) {
        // Set default directive with mode
        const defaultDirective = {
          name: 'Default Announcement',
          description: 'Announce all clears',
          mode: DIRECTIVE_MODES.STATIC,
          actions: [{
            channelId: availableChannels[0]?.id || '',
            pingType: 'NONE'
          }],
          sortOrder: 0,
          isActive: true,
          firstOfKind: false
        };
        setDirectives([defaultDirective]);
        setOriginalDirectives([defaultDirective]);
      } else {
        // Ensure firstOfKind is included for each directive
        const directivesWithFirstOfKind = loadedDirectives.map(directive => ({
          ...directive,
          firstOfKind: directive.firstOfKind ?? false
        }));
        setDirectives(directivesWithFirstOfKind);
        setOriginalDirectives(directivesWithFirstOfKind);
      }
    } catch (err) {
      setDirectivesError(tDiff('errors.loadDirectives'));
      console.error(err);
    } finally {
      setIsLoadingDirectives(false);
    }
  };

  const loadAvailableRoles = async () => {
    try {
      const response = await api.get(`${import.meta.env.VITE_DIFFICULTIES}/roles`, {
        headers: {
          'X-Super-Admin-Password': verifiedPassword
        }
      });
      setAvailableRoles(response.data || []);
    } catch (err) {
      console.error('Error loading roles:', err);
      setAvailableRoles([]);
    }
  };

  const loadAvailableChannels = async () => {
    try {
      const response = await api.get(`${import.meta.env.VITE_DIFFICULTIES}/channels`, {
        headers: {
          'X-Super-Admin-Password': verifiedPassword
        }
      });
      const channels = response.data || [];
      setAvailableChannels(channels);
      
      // If we're creating a new directive and no channels exist, create a default one
      if (channels.length === 0) {
        const defaultChannel = {
          label: 'Default Channel',
          webhookUrl: '',
          isActive: true
        };
        
        await api.post(
          `${import.meta.env.VITE_DIFFICULTIES}/channels`,
          defaultChannel,
          {
            headers: {
              'X-Super-Admin-Password': verifiedPassword
            }
          }
        );
        
        // Refresh channels after creating default
        const updatedResponse = await api.get(`${import.meta.env.VITE_DIFFICULTIES}/channels`, {
          headers: {
            'X-Super-Admin-Password': verifiedPassword
          }
        });
        setAvailableChannels(updatedResponse.data || []);
      }
    } catch (err) {
      console.error('Error loading channels:', err);
      setAvailableChannels([]);
    }
  };

  const showToast = (message, type = 'success') => {
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  const handleAddDirective = () => {
    setDirectives([
      ...directives,
      {
        name: 'New Directive',
        description: '',
        mode: DIRECTIVE_MODES.STATIC,
        triggerType: TRIGGER_TYPES.PASS,
        condition: null,
        actions: [{
          channelId: availableChannels[0]?.id || '',
          pingType: 'NONE',
          roleId: null
        }],
        sortOrder: directives.length,
        isActive: true
      }
    ]);
    showToast(tDiff('announcements.directive.addSuccess'));
  };

  const handleRemoveDirective = (index) => {
    const newDirectives = directives.filter((_, i) => i !== index);
    setDirectives(newDirectives);
    showToast(tDiff('announcements.directive.removeSuccess'));
  };

  const handleDirectiveChange = (index, field, value) => {
    const newDirectives = [...directives];
    
    if (field.startsWith('condition.')) {
      const conditionField = field.split('.')[1];
      newDirectives[index] = {
        ...newDirectives[index],
        condition: {
          ...newDirectives[index].condition,
          [conditionField]: value
        }
      };
    } else if (field.startsWith('actions.')) {
      const [_, actionIndex, actionField] = field.split('.');
      const newActions = [...newDirectives[index].actions];
      newActions[actionIndex] = {
        ...newActions[actionIndex],
        [actionField]: value
      };
      newDirectives[index] = {
        ...newDirectives[index],
        actions: newActions
      };
    } else {
      newDirectives[index] = {
        ...newDirectives[index],
        [field]: value
      };
    }
    
    setDirectives(newDirectives);
  };

  const handleSaveDirectives = async (e) => {
    e.preventDefault();
    if (!difficulty?.id) return;

    // Ensure all directives have required fields
    const formattedDirectives = directives.map((dir, index) => ({
      ...dir,
      triggerType: dir.triggerType || TRIGGER_TYPES.PASS,
      condition: dir.mode === DIRECTIVE_MODES.CONDITIONAL ? (dir.condition || {
        type: 'ACCURACY',
        value: 0,
        operator: 'GREATER_THAN_EQUAL'
      }) : null,
      actions: dir.actions.map(action => ({
        ...action,
        channelId: Number(action.channelId),
        roleId: action.pingType === 'ROLE' ? Number(action.roleId) : null
      })),
      sortOrder: index
    }));

    try {
      const response = await api.post(
        `${import.meta.env.VITE_DIFFICULTIES}/${difficulty.id}/directives`,
        { directives: formattedDirectives },
        {
          headers: {
            'X-Super-Admin-Password': verifiedPassword
          }
        }
      );
      
      setDirectivesError('');
      setOriginalDirectives([...formattedDirectives]);
      setDirectives([...formattedDirectives]);
      showToast(tDiff('announcements.directive.saveSuccess'));
    } catch (err) {
      const errorMessage = err.response?.data?.error || tDiff('announcements.directive.saveError');
      const errorDetails = err.response?.data?.details;
      
      // If it's a custom directive validation error, show the specific error message
      if (errorMessage === 'Invalid custom directive format' && errorDetails) {
        setDirectivesError(`${errorMessage}: ${errorDetails}`);
        showToast(`${errorMessage}: ${errorDetails}`, 'error');
      } else {
        setDirectivesError(errorMessage);
        showToast(errorMessage, 'error');
      }
      console.error(err);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!pendingDirectives || !difficulty?.id) return;

    try {
      await api.post(
        `${import.meta.env.VITE_DIFFICULTIES}/${difficulty.id}/directives`,
        { directives: pendingDirectives },
        {
          headers: {
            'X-Super-Admin-Password': password
          }
        }
      );
      setDirectivesError('');
      setPasswordError('');
      setShowPasswordModal(false);
      setPassword('');
      setPendingDirectives(null);
      await loadDirectives();
    } catch (err) {
      if (err.response?.status === 401) {
        setPasswordError(tDiff('errors.invalidPassword'));
      } else {
        setDirectivesError('Failed to save announcement directives');
        setShowPasswordModal(false);
        setPassword('');
        setPendingDirectives(null);
      }
      console.error(err);
    }
  };

  const handleEditChannel = (channel) => {
    console.log('Edit channel button clicked:', channel);
    
    if (!channel) {
      console.error('Cannot edit channel: channel object is null or undefined');
      showToast(tDiff('errors.channelEditFailed'), 'error');
      return;
    }
    
    if (!channel.id) {
      console.error('Cannot edit channel: channel ID is missing', channel);
      showToast(tDiff('errors.channelEditFailed'), 'error');
      return;
    }
    
    try {
      setChannelModalSource('edit');
      setSelectedChannel(channel);
      setChannelLabel(channel.label || '');
      setChannelWebhookUrl(channel.webhookUrl || '');
      setShowChannelModal(true);
      console.log('Channel modal opened successfully for channel:', channel.id);
    } catch (error) {
      console.error('Error opening channel modal:', error);
      showToast(tDiff('errors.channelEditFailed'), 'error');
    }
  };

  const handleEditRole = (role) => {
    console.log('Edit role button clicked:', role);
    
    if (!role) {
      console.error('Cannot edit role: role object is null or undefined');
      showToast(tDiff('errors.roleEditFailed'), 'error');
      return;
    }
    
    if (!role.id) {
      console.error('Cannot edit role: role ID is missing', role);
      showToast(tDiff('errors.roleEditFailed'), 'error');
      return;
    }
    
    try {
      setRoleModalSource('edit');
      setSelectedRole(role);
      setShowRoleModal(true);
      console.log('Role modal opened successfully for role:', role.id);
    } catch (error) {
      console.error('Error opening role modal:', error);
      showToast(tDiff('errors.roleEditFailed'), 'error');
    }
  };

  const handleAddNewChannel = () => {
    setChannelModalSource('new');
    setSelectedChannel({
      webhookUrl: ''
    });
    setShowChannelModal(true);
  };

  const handleAddNewRole = () => {
    setRoleModalSource('new');
    setSelectedRole({
      id: '',
      name: ''
    });
    setShowRoleModal(true);
  };

  const handleChannelSubmit = async (e) => {
    e.preventDefault();
    setChannelError('');
    
    try {
      const channelData = {
        webhookUrl: channelWebhookUrl,
        label: channelLabel
      };

      if (selectedChannel?.id) {
        // Update existing channel
        await api.put(
          `${import.meta.env.VITE_DIFFICULTIES}/channels/${selectedChannel.id}`,
          channelData,
          {
            headers: {
              'X-Super-Admin-Password': verifiedPassword
            }
          }
        );
        showToast(tDiff('announcements.directive.channelUpdateSuccess'));
      } else {
        // Create new channel
        await api.post(
          `${import.meta.env.VITE_DIFFICULTIES}/channels`,
          channelData,
          {
            headers: {
              'X-Super-Admin-Password': verifiedPassword
            }
          }
        );
        showToast(tDiff('announcements.directive.channelAddSuccess'));
      }

      // Refresh available channels
      await loadAvailableChannels();
      
      // Only close modal and reset state on success
      setShowChannelModal(false);
      setSelectedChannel(null);
      setChannelLabel('');
      setChannelWebhookUrl('');
    } catch (error) {
      console.error('Error saving channel:', error);
      setChannelError(tDiff('errors.channelSaveFailed'));
      showToast(tDiff('errors.channelSaveFailed'), 'error');
    }
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    setRoleError('');

    try {
      const roleData = {
        roleId: selectedRole.roleId,
        label: selectedRole.label
      };

      if (selectedRole.id) {
        // Update existing role
        await api.put(`${import.meta.env.VITE_DIFFICULTIES}/roles/${selectedRole.id}`, roleData, {
          headers: {
            'X-Super-Admin-Password': verifiedPassword
          }
        });
        showToast(tDiff('announcements.directive.roleUpdateSuccess'));
      } else {
        // Create new role
        await api.post(`${import.meta.env.VITE_DIFFICULTIES}/roles`, roleData, {
          headers: {
            'X-Super-Admin-Password': verifiedPassword
          }
        });
        showToast(tDiff('announcements.directive.roleAddSuccess'));
      }

      // Refresh available roles
      await loadAvailableRoles();
      
      // Only close modal and reset state on success
      setShowRoleModal(false);
      setSelectedRole(null);
    } catch (error) {
      console.error('Error saving role:', error);
      setRoleError(tDiff('errors.roleSaveFailed'));
      showToast(tDiff('errors.roleSaveFailed'), 'error');
    }
  };

  const handleDeleteChannel = async () => {
    if (!selectedChannel?.type) return;

    try {
      await api.delete(
        `${import.meta.env.VITE_DIFFICULTIES}/channels/${selectedChannel.id}`,
        {
          headers: {
            'X-Super-Admin-Password': verifiedPassword
          }
        }
      );

      setShowChannelModal(false);
      setSelectedChannel(null);
      await loadDirectives();
      showToast(tDiff('announcements.directive.channelDeleteSuccess'));
    } catch (err) {
      setChannelError('Failed to delete channel');
      showToast(tDiff('errors.channelDeleteFailed'), 'error');
      console.error(err);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole?.id) return;

    try {
      await api.delete(
        `${import.meta.env.VITE_DIFFICULTIES}/roles/${selectedRole.id}`,
        {
          headers: {
            'X-Super-Admin-Password': verifiedPassword
          }
        }
      );

      setShowRoleModal(false);
      setSelectedRole(null);
      await loadAvailableRoles();
      showToast(tDiff('announcements.directive.roleDeleteSuccess'));
    } catch (err) {
      setRoleError('Failed to delete role');
      showToast(tDiff('errors.roleDeleteFailed'), 'error');
      console.error(err);
    }
  };

  const handleAddAction = (directiveIndex) => {
    const newDirectives = [...directives];
    if (!newDirectives[directiveIndex].actions) {
      newDirectives[directiveIndex].actions = [];
    }
    newDirectives[directiveIndex].actions.push({
      channelId: availableChannels[0]?.id || '',
      pingType: 'NONE'
    });
    setDirectives(newDirectives);
  };

  const handleRemoveAction = (directiveIndex, actionIndex) => {
    const newDirectives = [...directives];
    newDirectives[directiveIndex].actions = newDirectives[directiveIndex].actions.filter((_, i) => i !== actionIndex);
    setDirectives(newDirectives);
  };

  useEffect(() => {
    if (showChannelModal) {
      console.log('Channel modal state changed to true');
      console.log('Selected channel:', selectedChannel);
      console.log('Channel label:', channelLabel);
      console.log('Channel webhook URL:', channelWebhookUrl);
    }
  }, [showChannelModal, selectedChannel, channelLabel, channelWebhookUrl]);

  useEffect(() => {
    if (showRoleModal) {
      console.log('Role modal state changed to true');
      console.log('Selected role:', selectedRole);
    }
  }, [showRoleModal, selectedRole]);

  // Helper function to get translation for condition type options
  const getConditionTypeOption = (type) => tDiff(`announcements.condition.type.options.${type}`);
  
  // Helper function to get translation for operator options
  const getOperatorOption = (operator) => tDiff(`announcements.condition.operator.options.${operator}`);
  
  // Helper function to get translation for ping type options
  const getPingTypeOption = (type) => tDiff(`announcements.actions.pingType.options.${type}`);

  const hasDirectiveChanges = (directive, index) => {
    const original = originalDirectives[index];
    if (!original) return true;

    // First check if actions arrays exist and have the same length
    if (!directive.actions || !original.actions) return true;
    if (directive.actions.length !== original.actions.length) return true;

    // Compare each action's properties
    const hasActionChanges = directive.actions.some((action, actionIndex) => {
      const originalAction = original.actions[actionIndex];
      if (!originalAction) return true;
      
      // Compare each property of the action
      return Object.keys(action).some(key => action[key] !== originalAction[key]);
    });

    if (hasActionChanges) return true;

    // Compare all other properties
    const directiveWithoutActions = { ...directive };
    const originalWithoutActions = { ...original };
    delete directiveWithoutActions.actions;
    delete originalWithoutActions.actions;

    return JSON.stringify(directiveWithoutActions) !== JSON.stringify(originalWithoutActions);
  };

  const hasAnyChanges = () => {
    // Check if number of directives changed
    if (directives.length !== originalDirectives.length) return true;
    
    // Check if any directive has changes
    return directives.some((directive, index) => hasDirectiveChanges(directive, index));
  };

  const handleCopyDirective = (directive) => {
    const directiveToCopy = {
      name: directive.name,
      description: directive.description,
      mode: directive.mode,
      triggerType: directive.triggerType,
      condition: directive.condition,
      actions: directive.actions.map(action => ({
        channelId: action.channelId,
        pingType: action.pingType,
        roleId: action.roleId
      })),
      isActive: directive.isActive,
      firstOfKind: directive.firstOfKind ?? false
    };
    
    navigator.clipboard.writeText(JSON.stringify(directiveToCopy))
      .then(() => {
        showToast(tDiff('announcements.directive.copySuccess'));
      })
      .catch(err => {
        console.error('Failed to copy directive settings:', err);
        showToast(tDiff('announcements.directive.copyError'), 'error');
        setPasteError(tDiff('announcements.directive.copyError'));
      });
  };

  const handlePasteDirective = (index, event) => {
    event.preventDefault();
    const pasteText = event.clipboardData.getData('text');
    setPasteError('');
    
    try {
      const pastedDirective = JSON.parse(pasteText);
      
      // Validate the pasted data structure
      if (!pastedDirective.name || !pastedDirective.mode || !pastedDirective.actions) {
        throw new Error('Invalid directive format');
      }
      
      // Update the directive at the specified index
      const newDirectives = [...directives];
      newDirectives[index] = {
        ...newDirectives[index],
        name: pastedDirective.name,
        description: pastedDirective.description || '',
        mode: pastedDirective.mode,
        triggerType: pastedDirective.triggerType || TRIGGER_TYPES.PASS,
        condition: pastedDirective.condition,
        actions: pastedDirective.actions.map(action => ({
          channelId: Number(action.channelId),
          pingType: action.pingType,
          roleId: action.pingType === 'ROLE' ? Number(action.roleId) : null
        })),
        isActive: pastedDirective.isActive ?? true,
        firstOfKind: pastedDirective.firstOfKind ?? false
      };
      
      setDirectives(newDirectives);
      showToast(tDiff('announcements.directive.pasteSuccess'));
    } catch (err) {
      console.error('Failed to paste directive settings:', err);
      setPasteError(tDiff('announcements.directive.pasteError'));
      showToast(tDiff('announcements.directive.pasteError'), 'error');
    }
  };

  const toggleDirective = (index) => {
    setExpandedDirectives(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleActions = (directiveIndex) => {
    setExpandedActions(prev => ({
      ...prev,
      [directiveIndex]: !prev[directiveIndex]
    }));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(directives);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update sortOrder for all items
    const updatedItems = items.map((item, index) => ({
      ...item,
      sortOrder: index
    }));

    setDirectives(updatedItems);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    if (activeTab === 'details') {
      if (!verifiedPassword) {
        showToast(tDiff('errors.passwordRequired'), 'error');
        return;
      }

      // For details tab, make API call based on whether creating or editing
      const updateDifficulty = async () => {
        try {
          const difficultyData = {
            id: difficulty.id,
            name: difficulty.name,
            type: difficulty.type,
            icon: difficulty.icon,
            emoji: difficulty.emoji,
            color: difficulty.color,
            baseScore: difficulty.baseScore,
            sortOrder: difficulty.sortOrder,
            legacy: difficulty.legacy,
            legacyIcon: difficulty.legacyIcon,
            legacyEmoji: difficulty.legacyEmoji
          };

          const response = await api[isCreating ? 'post' : 'put'](
            `${import.meta.env.VITE_DIFFICULTIES}${isCreating ? '' : `/${difficulty.id}`}`,
            difficultyData,
            {
              headers: {
                'X-Super-Admin-Password': verifiedPassword
              }
            }
          );
          
          showToast(tDiff(isCreating ? 'notifications.created' : 'notifications.updated'), 'success');
          onClose();
          refreshDifficulties();
        } catch (err) {
          const errorMessage = err.response?.data?.error || tDiff(isCreating ? 'errors.createFailed' : 'errors.updateFailed');
          showToast(errorMessage, 'error');
          console.error(err);
        }
      };

      updateDifficulty();
    } else if (activeTab === 'announcements') {
      handleSaveDirectives(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="difficulty-modal"
      ref={modalRef}
    >
      <div className="difficulty-modal__content">
        <button 
          className="difficulty-modal__close-button"
          onClick={onClose}
          aria-label={tDiff('modal.close')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="difficulty-modal__password-modal">
            <div className="difficulty-modal__password-modal-content">
              <h3>{tDiff('modal.password.title')}</h3>
              <form onSubmit={handlePasswordSubmit}>
                <div className="difficulty-modal__form-group">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tDiff('modal.password.placeholder')}
                    required
                    className="difficulty-modal__form-input"
                  />
                </div>
                {passwordError && <div className="difficulty-modal__error-message">{passwordError}</div>}
                <div className="difficulty-modal__actions">
                  <button type="submit" className="difficulty-modal__button difficulty-modal__button--save">
                    {tDiff('modal.password.confirm')}
                  </button>
                  <button
                    type="button"
                    className="difficulty-modal__button difficulty-modal__button--cancel"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPassword('');
                      setPasswordError('');
                      setPendingDirectives(null);
                    }}
                  >
                    {tDiff('buttons.cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Channel Modal */}
        {showChannelModal && (
          <div className="difficulty-modal__channel-modal">
            <div className="difficulty-modal__channel-modal-content">
              <h3>{channelModalSource === 'edit' ? tDiff('modal.channel.editTitle') : tDiff('modal.channel.addTitle')}</h3>
              <form onSubmit={handleChannelSubmit}>
                <div className="difficulty-modal__form-group">
                  <label className="difficulty-modal__form-label">{tDiff('modal.channel.label')}</label>
                  <input
                    type="text"
                    value={channelLabel}
                    onChange={(e) => setChannelLabel(e.target.value)}
                    placeholder={tDiff('modal.channel.labelPlaceholder')}
                    required
                    className="difficulty-modal__form-input"
                  />
                </div>
                <div className="difficulty-modal__form-group">
                  <label className="difficulty-modal__form-label">{tDiff('modal.channel.webhookUrl')}</label>
                  <input
                    type="text"
                    value={channelWebhookUrl}
                    onChange={(e) => setChannelWebhookUrl(e.target.value)}
                    placeholder={tDiff('modal.channel.webhookUrlPlaceholder')}
                    required
                    className="difficulty-modal__form-input"
                  />
                </div>
                {channelError && <div className="difficulty-modal__error-message">{channelError}</div>}
                <div className="difficulty-modal__actions">
                  <button type="submit" className="difficulty-modal__button difficulty-modal__button--save">
                    {channelModalSource === 'edit' ? tDiff('buttons.save') : tDiff('buttons.add')}
                  </button>
                  {channelModalSource === 'edit' && (
                    <button
                      type="button"
                      className="difficulty-modal__button difficulty-modal__button--delete"
                      onClick={handleDeleteChannel}
                    >
                      {tDiff('buttons.delete')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="difficulty-modal__button difficulty-modal__button--cancel"
                    onClick={() => {
                      setShowChannelModal(false);
                      setSelectedChannel(null);
                      setChannelLabel('');
                      setChannelWebhookUrl('');
                      setChannelError('');
                    }}
                  >
                    {tDiff('buttons.cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Role Modal */}
        {showRoleModal && (
          <div className="difficulty-modal__role-modal">
            <div className="difficulty-modal__role-modal-content">
              <h3>{roleModalSource === 'edit' ? tDiff('modal.role.editTitle') : tDiff('modal.role.addTitle')}</h3>
              <form onSubmit={handleRoleSubmit}>
                <div className="difficulty-modal__form-group">
                  <label className="difficulty-modal__form-label">{tDiff('modal.role.roleId')}</label>
                  <input
                    type="text"
                    value={selectedRole?.roleId || ''}
                    onChange={(e) => setSelectedRole({...selectedRole, roleId: e.target.value})}
                    placeholder={tDiff('modal.role.roleIdPlaceholder')}
                    required
                    className="difficulty-modal__form-input"
                  />
                </div>
                <div className="difficulty-modal__form-group">
                  <label className="difficulty-modal__form-label">{tDiff('modal.role.label')}</label>
                  <input
                    type="text"
                    value={selectedRole?.label || ''}
                    onChange={(e) => setSelectedRole({...selectedRole, label: e.target.value})}
                    placeholder={tDiff('modal.role.labelPlaceholder')}
                    required
                    className="difficulty-modal__form-input"
                  />
                </div>
                {roleError && <div className="difficulty-modal__error-message">{roleError}</div>}
                <div className="difficulty-modal__actions">
                  <button type="submit" className="difficulty-modal__button difficulty-modal__button--save">
                    {roleModalSource === 'edit' ? tDiff('buttons.save') : tDiff('buttons.add')}
                  </button>
                  {roleModalSource === 'edit' && (
                    <button
                      type="button"
                      className="difficulty-modal__button difficulty-modal__button--delete"
                      onClick={handleDeleteRole}
                    >
                      {tDiff('buttons.delete')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="difficulty-modal__button difficulty-modal__button--cancel"
                    onClick={() => {
                      setShowRoleModal(false);
                      setSelectedRole(null);
                      setRoleError('');
                    }}
                  >
                    {tDiff('buttons.cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="difficulty-modal__tabs">
          <button 
            className={`difficulty-modal__tab-button ${activeTab === 'details' ? 'difficulty-modal__tab-button--active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            {tDiff('tabs.details')}
          </button>
          {!isCreating && (
            <button 
              className={`difficulty-modal__tab-button ${activeTab === 'announcements' ? 'difficulty-modal__tab-button--active' : ''}`}
              onClick={() => setActiveTab('announcements')}
            >
              {tDiff('tabs.announcement')}
            </button>
          )}
        </div>

        <div className="difficulty-modal__content-scroll">
          {activeTab === 'details' ? (
            <form onSubmit={handleFormSubmit}>
              <h2 className="difficulty-modal__title">{isCreating ? tDiff('modal.create.title') : tDiff('modal.edit.title')}</h2>
              <div className="difficulty-modal__form-group">
                <label className="difficulty-modal__form-label">{tDiff('form.labels.id')}</label>
                <input
                  type="number"
                  value={difficulty.id}
                  onChange={(e) => onChange({ ...difficulty, id: parseInt(e.target.value) })}
                  disabled={!isCreating}
                  required
                  className="difficulty-modal__form-input"
                />
              </div>

              <div className="difficulty-modal__form-group">
                <label className="difficulty-modal__form-label">{tDiff('form.labels.name')}</label>
                <input
                  type="text"
                  value={difficulty.name}
                  onChange={(e) => onChange({ ...difficulty, name: e.target.value })}
                  required
                  className="difficulty-modal__form-input"
                />
              </div>

              <div className="difficulty-modal__form-group">
                <label className="difficulty-modal__form-label">{tDiff('form.labels.type')}</label>
                <select
                  value={difficulty.type}
                  onChange={(e) => onChange({ ...difficulty, type: e.target.value })}
                  required
                  className="difficulty-modal__form-select"
                >
                  <option value="PGU">{tDiff('difficultyTypes.PGU')}</option>
                  <option value="SPECIAL">{tDiff('difficultyTypes.SPECIAL')}</option>
                </select>
              </div>

              <div className="difficulty-modal__form-group">
                <label className="difficulty-modal__form-label">{tDiff('form.labels.icon')}</label>
                <input
                  type="text"
                  value={difficulty.icon}
                  onChange={(e) => onChange({ ...difficulty, icon: e.target.value })}
                  required
                  className="difficulty-modal__form-input"
                />
              </div>

              <div className="difficulty-modal__form-group">
                <label className="difficulty-modal__form-label">{tDiff('form.labels.legacyIcon')}</label>
                <input
                  type="text"
                  value={difficulty.legacyIcon}
                  onChange={(e) => onChange({ ...difficulty, legacyIcon: e.target.value })}
                  className="difficulty-modal__form-input"
                />
              </div>

              <div className="difficulty-modal__form-group">
                <label className="difficulty-modal__form-label">{tDiff('form.labels.emoji')}</label>
                <input
                  type="text"
                  value={difficulty.emoji}
                  onChange={(e) => onChange({ ...difficulty, emoji: e.target.value })}
                  required
                  className="difficulty-modal__form-input"
                />
              </div>

              <div className="difficulty-modal__form-group">
                <label className="difficulty-modal__form-label">{tDiff('form.labels.legacyEmoji')}</label>
                <input
                  type="text"
                  value={difficulty.legacyEmoji}
                  onChange={(e) => onChange({ ...difficulty, legacyEmoji: e.target.value })}
                  className="difficulty-modal__form-input"
                />
              </div>

              <div className="difficulty-modal__form-group">
                <label className="difficulty-modal__form-label">{tDiff('form.labels.color')}</label>
                <div className="difficulty-modal__color-input-container">
                  <input
                    type="color"
                    value={difficulty.color}
                    onChange={(e) => onChange({ ...difficulty, color: e.target.value })}
                    required
                    className="difficulty-modal__color-picker"
                  />
                  <input
                    type="text"
                    value={difficulty.color}
                    onChange={(e) => onChange({ ...difficulty, color: e.target.value })}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    placeholder={tDiff('form.placeholders.color')}
                    required
                    className="difficulty-modal__form-input"
                  />
                </div>
              </div>

              <div className="difficulty-modal__form-group">
                <label className="difficulty-modal__form-label">{tDiff('form.labels.baseScore')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={difficulty.baseScore}
                  onChange={(e) => onChange({ ...difficulty, baseScore: parseFloat(e.target.value) })}
                  required
                  className="difficulty-modal__form-input"
                />
              </div>

              <div className="difficulty-modal__form-group">
                <label className="difficulty-modal__form-label">{tDiff('form.labels.sortOrder')}</label>
                <input
                  type="number"
                  value={difficulty.sortOrder}
                  onChange={(e) => onChange({ ...difficulty, sortOrder: parseInt(e.target.value) })}
                  required
                  className="difficulty-modal__form-input"
                />
              </div>

              <div className="difficulty-modal__form-group">
                <label className="difficulty-modal__form-label">{tDiff('form.labels.legacy')}</label>
                <input
                  type="text"
                  value={difficulty.legacy}
                  onChange={(e) => onChange({ ...difficulty, legacy: e.target.value })}
                  required
                  className="difficulty-modal__form-input"
                />
              </div>

              {error && <div className="difficulty-modal__error-message">{error}</div>}

              <div className="difficulty-modal__actions">
                <button type="submit" className="difficulty-modal__button difficulty-modal__button--save">
                  {isCreating ? tDiff('buttons.create') : tDiff('buttons.save')}
                </button>
                <button
                  type="button"
                  className="difficulty-modal__button difficulty-modal__button--cancel"
                  onClick={onClose}
                >
                  {tDiff('buttons.cancel')}
                </button>
              </div>
            </form>
          ) : (
            <div className="difficulty-modal__announcements">
              <h2 className="difficulty-modal__title">{tDiff('announcements.title', { diffName: difficulty.name })}</h2>
              {isLoadingDirectives ? (
                <div className="difficulty-modal__loading-message">{tDiff('loading.directives')}</div>
              ) : (
                <form onSubmit={handleFormSubmit}>
                  <div className="difficulty-modal__directives-list">
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="directives">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="difficulty-modal__directives-container"
                          >
                            {directives.map((directive, index) => (
                              <Draggable
                                key={index}
                                draggableId={`directive-${index}`}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`difficulty-modal__directive-item ${snapshot.isDragging ? 'difficulty-modal__directive-item--dragging' : ''}`}
                                  >
                                    <div className="difficulty-modal__directive-header">
                                      <div className="difficulty-modal__directive-header-left">
                                        <div {...provided.dragHandleProps} className="difficulty-modal__drag-handle">
                                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M8 6H16M8 12H16M8 18H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                        </div>
                                        <button
                                          type="button"
                                          className={`difficulty-modal__expand-button ${expandedDirectives[index] ? 'expanded' : ''}`}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggleDirective(index);
                                          }}
                                          aria-label={expandedDirectives[index] ? 'Collapse directive' : 'Expand directive'}
                                        >
                                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                        </button>
                                        <h3 className="difficulty-modal__directive-title">{directive.name}</h3>
                                      </div>
                                      <div className="difficulty-modal__directive-status">
                                        {hasDirectiveChanges(directive, index) ? (
                                          <>
                                            <PencilIcon className="difficulty-modal__directive-edit-icon" />
                                          </>
                                        ) : (
                                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="difficulty-modal__directive-check-icon">
                                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                        )}
                                        {directives.length > 1 && (
                                          <button
                                            type="button"
                                            className="difficulty-modal__directive-remove-button"
                                            onClick={() => handleRemoveDirective(index)}
                                            aria-label={tDiff('announcements.directive.remove')}
                                          >
                                            <TrashIcon color="#f55" size="1.5rem" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <div className={`difficulty-modal__directive-content ${expandedDirectives[index] ? 'expanded' : ''}`}>
                                      <div className="difficulty-modal__directive-actions">
                                        <button
                                          type="button"
                                          className="difficulty-modal__directive-copy-button"
                                          onClick={() => handleCopyDirective(directive)}
                                          aria-label={tDiff('announcements.directive.copy')}
                                        >
                                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M8 4V16C8 17.1046 8.89543 18 10 18H18C19.1046 18 20 17.1046 20 16V7.24162C20 6.7034 19.7831 6.18861 19.4 5.8L16.2 2.6C15.8114 2.21687 15.2966 2 14.7584 2H10C8.89543 2 8 2.89543 8 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M16 18V20C16 21.1046 15.1046 22 14 22H6C4.89543 22 4 21.1046 4 20V8C4 6.89543 4.89543 6 6 6H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                        </button>
                                        <div className="difficulty-modal__directive-paste-container">
                                          <input
                                            type="text"
                                            className="difficulty-modal__directive-paste-input"
                                            placeholder={tDiff('announcements.directive.paste')}
                                            onPaste={(e) => handlePasteDirective(index, e)}
                                          />
                                        </div>
                                        {pasteError && <div className="difficulty-modal__paste-error">{pasteError}</div>}
                                      </div>

                                      <div className="difficulty-modal__form-group">
                                        <label className="difficulty-modal__form-label">{tDiff('announcements.directive.name')}</label>
                                        <input
                                          type="text"
                                          value={directive.name}
                                          onChange={(e) => handleDirectiveChange(index, 'name', e.target.value)}
                                          required
                                          className="difficulty-modal__form-input"
                                        />
                                      </div>

                                      <div className="difficulty-modal__form-group">
                                        <label className="difficulty-modal__form-label">{tDiff('announcements.mode.label')}</label>
                                        <select
                                          value={directive.mode}
                                          onChange={(e) => {
                                            const newMode = e.target.value;
                                            const updatedDirective = {
                                              ...directive,
                                              mode: newMode,
                                              ...(newMode === DIRECTIVE_MODES.CONDITIONAL && !directive.condition ? {
                                                condition: {
                                                  type: 'ACCURACY',
                                                  value: 0,
                                                  operator: 'GREATER_THAN_EQUAL'
                                                }
                                              } : {})
                                            };
                                            setDirectives(prevDirectives => {
                                              const newDirectives = [...prevDirectives];
                                              newDirectives[index] = updatedDirective;
                                              return newDirectives;
                                            });
                                          }}
                                          className="difficulty-modal__form-select"
                                        >
                                          <option value={DIRECTIVE_MODES.STATIC}>
                                            {tDiff('announcements.mode.static')}
                                          </option>
                                          <option value={DIRECTIVE_MODES.CONDITIONAL}>
                                            {tDiff('announcements.mode.conditional')}
                                          </option>
                                        </select>
                                      </div>

                                      <div className="difficulty-modal__form-group">
                                        <StateDisplay
                                          currentState={directive.triggerType || TRIGGER_TYPES.PASS}
                                          states={[TRIGGER_TYPES.PASS, TRIGGER_TYPES.LEVEL]}
                                          onChange={(value) => handleDirectiveChange(index, 'triggerType', value)}
                                          width={60}
                                          label={tDiff('announcements.directive.triggerType')}
                                        />
                                      </div>

                                      <div className="difficulty-modal__form-group">
                                        <label className="difficulty-modal__form-label">{tDiff('announcements.directive.description')}</label>
                                        <textarea
                                          value={directive.description}
                                          onChange={(e) => handleDirectiveChange(index, 'description', e.target.value)}
                                          className="difficulty-modal__form-textarea"
                                        />
                                      </div>

                                      {directive.mode === DIRECTIVE_MODES.CONDITIONAL && (
                                        <>
                                          <div className="difficulty-modal__form-group">
                                            <label className="difficulty-modal__form-label">{tDiff('announcements.condition.type.label')}</label>
                                            <select
                                              value={directive.condition?.type || 'ACCURACY'}
                                              onChange={(e) => handleDirectiveChange(index, 'condition.type', e.target.value)}
                                              required
                                              className="difficulty-modal__form-select"
                                            >
                                              {['ACCURACY', 'WORLDS_FIRST', 'BASE_SCORE', 'CUSTOM'].map(type => (
                                                <option key={type} value={type}>
                                                  {getConditionTypeOption(type)}
                                                </option>
                                              ))}
                                            </select>
                                          </div>

                                          {(directive.condition?.type === 'ACCURACY' || directive.condition?.type === 'BASE_SCORE') && (
                                            <>
                                              <div className="difficulty-modal__form-group">
                                                <label className="difficulty-modal__form-label">{tDiff('announcements.condition.operator.label')}</label>
                                                <select
                                                  value={directive.condition?.operator || 'GREATER_THAN_EQUAL'}
                                                  onChange={(e) => handleDirectiveChange(index, 'condition.operator', e.target.value)}
                                                  required
                                                  className="difficulty-modal__form-select"
                                                >
                                                  {['EQUAL', 'GREATER_THAN', 'LESS_THAN', 'GREATER_THAN_EQUAL', 'LESS_THAN_EQUAL'].map(operator => (
                                                    <option key={operator} value={operator}>
                                                      {getOperatorOption(operator)}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>

                                              <div className="difficulty-modal__form-group">
                                                <label className="difficulty-modal__form-label">{tDiff('announcements.condition.value')}</label>
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  value={directive.condition?.value}
                                                  onChange={(e) => handleDirectiveChange(index, 'condition.value', parseFloat(e.target.value))}
                                                  required
                                                  className="difficulty-modal__form-input"
                                                />
                                              </div>
                                            </>
                                          )}

                                          {directive.condition?.type === 'CUSTOM' && (
                                            <div className="difficulty-modal__form-group">
                                              <div className="difficulty-modal__custom-function-header">
                                                <label className="difficulty-modal__form-label">{tDiff('announcements.condition.customFunction')}</label>
                                                <button
                                                  type="button"
                                                  className="difficulty-modal__help-button"
                                                  onClick={() => setShowHelpModal(true)}
                                                  aria-label="Show custom function help"
                                                >
                                                  <QuestionmarkCircleIcon color="#fff" size="24px" />
                                                </button>
                                              </div>
                                              <textarea
                                                value={directive.condition?.customFunction || ''}
                                                onChange={(e) => handleDirectiveChange(index, 'condition.customFunction', e.target.value)}
                                                required
                                                className="difficulty-modal__form-textarea"
                                              />
                                            </div>
                                          )}
                                        </>
                                      )}

                                      <div className="difficulty-modal__actions-section">
                                        <div className="difficulty-modal__actions-header">
                                          <h4 className="difficulty-modal__actions-title">{tDiff('announcements.actions.title')}</h4>
                                          <button
                                            type="button"
                                            className={`difficulty-modal__expand-button ${expandedActions[index] ? 'expanded' : ''}`}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              toggleActions(index);
                                            }}
                                            aria-label={expandedActions[index] ? 'Collapse actions' : 'Expand actions'}
                                          >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                              <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                          </button>
                                        </div>
                                        <div className={`difficulty-modal__actions-content ${expandedActions[index] ? 'expanded' : ''}`}>
                                          {directive?.actions?.map((action, actionIndex) => (
                                            <div key={actionIndex} className="difficulty-modal__action-item">
                                              <button
                                                type="button"
                                                className="difficulty-modal__action-remove-button"
                                                onClick={() => handleRemoveAction(index, actionIndex)}
                                                aria-label={tDiff('announcements.actions.remove')}
                                              >
                                                <TrashIcon color="#f55" size="1.2rem" />
                                              </button>
                                              <div className="difficulty-modal__form-group">
                                                <label className="difficulty-modal__form-label">{tDiff('announcements.actions.channel', { returnObjects: true })["label"]}</label>
                                                <div className="difficulty-modal__select-with-edit">
                                                  <CustomSelect
                                                    width="100%"
                                                    value={availableChannels.find(c => c.id === action.channelId) || null}
                                                    onChange={(option) => {
                                                      if (option.value === 'add_new') {
                                                        handleAddNewChannel();
                                                      } else {
                                                        handleDirectiveChange(index, `actions.${actionIndex}.channelId`, option.value);
                                                      }
                                                    }}
                                                    options={[
                                                      ...availableChannels.map(channel => ({
                                                        value: channel.id,
                                                        label: channel.label
                                                      })),
                                                      { value: 'add_new', label: `+ ${tDiff('announcements.actions.channel.add')}` }
                                                    ]}
                                                  />
                                                  {action.channelId && !['EVERYONE', 'NONE'].includes(action.channelId) && (
                                                    <button
                                                      type="button"
                                                      className="difficulty-modal__select-edit-button"
                                                      onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        console.log('Channel edit button clicked for channelId:', action.channelId);
                                                        const channelToEdit = availableChannels.find(c => c.id === action.channelId);
                                                        console.log('Found channel to edit:', channelToEdit);
                                                        handleEditChannel(channelToEdit);
                                                      }}
                                                      aria-label={tDiff('announcements.actions.channel.edit')}
                                                    >
                                                      <EditIcon className="difficulty-modal__select-edit-button-icon" />
                                                    </button>
                                                  )}
                                                </div>
                                              </div>

                                              <div className="difficulty-modal__form-group">
                                                <label className="difficulty-modal__form-label">{tDiff('announcements.actions.pingType', { returnObjects: true })["label"]}</label>
                                                <CustomSelect
                                                  value={{ value: action.pingType, label: getPingTypeOption(action.pingType) }}
                                                  onChange={(option) => handleDirectiveChange(index, `actions.${actionIndex}.pingType`, option.value)}
                                                  options={['NONE', 'ROLE', 'EVERYONE'].map(type => ({
                                                    value: type,
                                                    label: getPingTypeOption(type)
                                                  }))}
                                                  width="100%"
                                                />
                                              </div>

                                              {action.pingType === 'ROLE' && (
                                                <div className="difficulty-modal__form-group">
                                                  <label className="difficulty-modal__form-label">{tDiff('announcements.actions.role', { returnObjects: true })["label"]}</label>
                                                  <div className="difficulty-modal__select-with-edit">
                                                    <CustomSelect
                                                      value={availableRoles.find(r => r.id === action.roleId) || null}
                                                      onChange={(option) => {
                                                        if (option.value === 'add_new') {
                                                          handleAddNewRole();
                                                        } else {
                                                          handleDirectiveChange(index, `actions.${actionIndex}.roleId`, option.value);
                                                        }
                                                      }}
                                                      options={[
                                                        ...availableRoles.map(role => ({
                                                          value: role.id,
                                                          label: role.label
                                                        })),
                                                        { value: 'add_new', label: `+ ${tDiff('announcements.actions.role.add')}` }
                                                      ]}
                                                      width="100%"
                                                    />
                                                    {action.roleId && action.roleId !== 'EVERYONE' && (
                                                      <button
                                                        type="button"
                                                        className="difficulty-modal__select-edit-button"
                                                        onClick={(e) => {
                                                          e.preventDefault();
                                                          e.stopPropagation();
                                                          console.log('Role edit button clicked for roleId:', action.roleId);
                                                          const roleToEdit = availableRoles.find(r => r.id === action.roleId);
                                                          console.log('Found role to edit:', roleToEdit);
                                                          handleEditRole(roleToEdit);
                                                        }}
                                                        aria-label={tDiff('announcements.actions.role.edit')}
                                                      >
                                                        <EditIcon className="difficulty-modal__select-edit-button-icon" />
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          ))}

                                          <button
                                            type="button"
                                            className="difficulty-modal__action-add-button"
                                            onClick={() => handleAddAction(index)}
                                          >
                                            {tDiff('announcements.actions.add')}
                                          </button>
                                        </div>
                                      </div>

                                      <div className="difficulty-modal__form-group-checkbox">
                                        <input
                                          type="checkbox"
                                          checked={directive.isActive}
                                          onChange={(e) => handleDirectiveChange(index, 'isActive', e.target.checked)}
                                          className="difficulty-modal__form-input-checkbox"
                                        />
                                        <label>
                                          {tDiff('announcements.directive.isActive')}
                                        </label>
                                      </div>

                                      <div className="difficulty-modal__form-group-checkbox">
                                        <input
                                          type="checkbox"
                                          checked={directive.firstOfKind}
                                          onChange={(e) => handleDirectiveChange(index, 'firstOfKind', e.target.checked)}
                                          className="difficulty-modal__form-input-checkbox"
                                        />
                                        <label>
                                          {tDiff('announcements.firstOfKind')}
                                        </label>
                                      </div>
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

                  <button
                    type="button"
                    className="difficulty-modal__directive-add-button"
                    onClick={handleAddDirective}
                  >
                    {tDiff('announcements.directive.add')}
                  </button>

                  <div className="difficulty-modal__actions">
                    <button 
                      type="submit" 
                      className={`difficulty-modal__button difficulty-modal__button--save ${!hasAnyChanges() ? 'difficulty-modal__button--disabled' : ''}`}
                    >
                      {tDiff('buttons.save')}
                    </button>
                    <button
                      type="button"
                      className="difficulty-modal__button difficulty-modal__button--cancel"
                      onClick={onClose}
                    >
                      {tDiff('buttons.cancel')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DifficultyPopup;