import { getVideoDetails } from "@/utils";
import placeholder from "@/assets/placeholder/1.png"
import "../adminsubmissionpage.css";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { isImageUrl } from "@/utils/Utility";
import api from "@/utils/api";
import { ProfileCreationModal } from './ProfileCreationModal';
import { SubmissionCreatorPopup } from '@/components/popups/Levels';
import { SongSelectorPopup } from '@/components/popups/Songs';
import { ArtistSelectorPopup } from '@/components/popups/Artists';
import { EntityActionPopup } from '@/components/popups/Entities';
import { EvidenceGalleryPopup } from '@/components/popups/Evidence';
import { CreatorAssignmentPopup } from '@/components/popups/Creators';
import { toast } from "react-hot-toast";
import { ServerCloudIcon, WarningIcon } from "@/components/common/icons";
import { Tooltip } from "react-tooltip";
import { formatDate } from "@/utils/Utility";
import i18next from "i18next";
import { CreatorIcon } from "@/components/common/icons/CreatorIcon";


const LevelSubmissions = () => {
  const { t } = useTranslation(['components', 'common']);
  
  const [submissions, setSubmissions] = useState([]);
  const [videoEmbeds, setVideoEmbeds] = useState({});
  const [animatingCards, setAnimatingCards] = useState({});
  const [disabledButtons, setDisabledButtons] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [profileCreation, setProfileCreation] = useState({
    show: false,
    submission: null,
    profiles: []
  });
  const [showCreatorPopup, setShowCreatorPopup] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [selectedCreatorRequest, setSelectedCreatorRequest] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showSongSelector, setShowSongSelector] = useState(false);
  const [showArtistSelector, setShowArtistSelector] = useState(false);
  const [selectedSongSubmission, setSelectedSongSubmission] = useState(null);
  const [selectedArtistSubmission, setSelectedArtistSubmission] = useState(null);
  const [selectedArtistRequest, setSelectedArtistRequest] = useState(null);
  const [showSongManagement, setShowSongManagement] = useState(false);
  const [showArtistManagement, setShowArtistManagement] = useState(false);
  const [selectedSongForManagement, setSelectedSongForManagement] = useState(null);
  const [selectedArtistForManagement, setSelectedArtistForManagement] = useState(null);
  const [showEvidenceGallery, setShowEvidenceGallery] = useState(false);
  const [selectedEvidenceSubmission, setSelectedEvidenceSubmission] = useState(null);
  const [editingSuffix, setEditingSuffix] = useState({});
  const [suffixValues, setSuffixValues] = useState({});
  const [showCreatorAssignmentModal, setShowCreatorAssignmentModal] = useState({});

  useEffect(() => {
    fetchPendingSubmissions();
  }, []);

  useEffect(() => {
    // Add event listener for refresh button
    const handleRefresh = () => {
      fetchPendingSubmissions();
    };
    window.addEventListener('refreshSubmissions', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshSubmissions', handleRefresh);
    };
  }, []);

  useEffect(() => {
    // Load video embeds when submissions change
    submissions.forEach(async (submission) => {
      if (submission.videoLink && !videoEmbeds[submission.id]) {
        try {
          const videoDetails = await getVideoDetails(submission.videoLink);
          setVideoEmbeds(prev => ({
            ...prev,
            [submission.id]: videoDetails
          }));
        } catch (error) {
          console.error('Error fetching video details:', error);
        }
      }
    });
  }, [submissions]);

  const canBeApproved = (submission) => {
    // Check if song is set (either existing song or new request)
    const hasSong = submission.songObject || submission.songId || submission.songRequest;
    
    if (!hasSong) {
      return false;
    }
    
    // Case 1: If existing song is selected (songId exists), artists are inherited from song credits
    if (submission.songId && submission.songObject?.credits) {
      // Artists will be inherited from song credits, no need to check artist requests
    } else {
      // Case 2 & 3: For new song requests, check if at least one artist is set
      const hasArtist = (submission.artistRequests && submission.artistRequests.length > 0) ||
                        submission.artistObject || submission.artistId;
      if (!hasArtist) {
        return false;
      }
    }
    
    // Check for pending creator requests
    const hasUnassignedCreators = submission.creatorRequests?.some(r => r.isNewRequest && !r.creatorId) ||
                                   (submission.teamRequestData?.isNewRequest && !submission.teamRequestData.teamId) ||
                                   submission.creatorRequests?.some(r => !r.creatorId);
    
    return !hasUnassignedCreators;
  }

  const fetchPendingSubmissions = async () => {
    try {
      setIsLoading(true);
      // Reset animation and disabled states when fetching new data
      setAnimatingCards({});
      setDisabledButtons({});
      
      const response = await api.get(`${import.meta.env.VITE_SUBMISSION_API}/levels/pending`);
      const data = await response.data;
      
      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new Event('submissionsLoadingComplete'));
    }
  };

  const handleSubmission = async (submissionId, action) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) return;

      // Check for profile creation requests when approving
      if (action === 'approve') {
        const pendingProfiles = [];
        
        // Check for pending creator requests
        submission.creatorRequests?.forEach(request => {
          if (request.isNewRequest && !request.creatorId) {
            pendingProfiles.push({
              type: request.role,
              name: request.creatorName
            });
          }
        });

        // Check for pending team request
        if (submission.teamRequestData?.isNewRequest && !submission.teamRequestData.teamId) {
          pendingProfiles.push({
            type: 'team',
            name: submission.teamRequestData.teamName
          });
        }

        // If there are pending profiles and trying to approve
        if (pendingProfiles.length > 0) {
          setProfileCreation({
            show: true,
            submission,
            profiles: pendingProfiles
          });
          return;
        }
      }

      // Disable buttons for this card
      setDisabledButtons(prev => ({
        ...prev,
        [submissionId]: true
      }));
      
      // Set animation state
      setAnimatingCards(prev => ({
        ...prev,
        [submissionId]: action
      }));

      // Wait for animation to complete before removing
      setTimeout(async () => {
        const response = await api.put(`${import.meta.env.VITE_SUBMISSION_API}/levels/${submissionId}/${action}`);
        
        if (response.status === 200) {
          setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
          setAnimatingCards(prev => {
            const newState = { ...prev };
            delete newState[submissionId];
            return newState;
          });
          // Clean up disabled state
          setDisabledButtons(prev => {
            const newState = { ...prev };
            delete newState[submissionId];
            return newState;
          });
        }
        else {
          console.error('Error updating submission:', response.statusText);
          // Re-enable buttons on error
          setDisabledButtons(prev => {
            const newState = { ...prev };
            delete newState[submissionId];
            return newState;
          });
        }
      }, 500);

    } catch (error) {
      console.error(`Error ${action}ing submission:`, error);
      // Re-enable buttons on error
      setDisabledButtons(prev => {
        const newState = { ...prev };
        delete newState[submissionId];
        return newState;
      });
    }
  };

  const handleProfileCreationComplete = async (createdProfiles) => {
    const { submission } = profileCreation;
    if (!submission) return;

    try {
      // Update submission with created profile IDs
      const updateData = {
        creatorRequests: submission.creatorRequests.map(request => {
          const createdProfile = createdProfiles.find(
            profile => profile.type === request.role && profile.name === request.creatorName
          );
          return {
            ...request,
            creatorId: createdProfile?.id || request.creatorId
          };
        }),
        teamRequestData: submission.teamRequestData && {
          ...submission.teamRequestData,
          teamId: createdProfiles.find(
            profile => profile.type === 'team' && profile.name === submission.teamRequestData.teamName
          )?.id || submission.teamRequestData.teamId
        }
      };

      await api.put(`${import.meta.env.VITE_SUBMISSION_API}/levels/${submission.id}/profiles`, updateData);

      // Now proceed with approval
      await handleSubmission(submission.id, 'approve');
    } catch (error) {
      console.error('Error updating submission with profiles:', error);
      toast.error(t('levelSubmissions.errors.profileUpdate'));
    } finally {
      setProfileCreation({
        show: false,
        submission: null,
        profiles: []
      });
    }
  };

  const handleProfileCreationCancel = () => {
    setProfileCreation({
      show: false,
      submission: null,
      profiles: []
    });
  };

  const handleCreatorAction = (submission, request, role) => {
    // For team requests, handle differently than creator requests
    if (role === 'team') {
      // If there's a team request, format the team data properly
      if (submission.teamRequestData?.team) {
        const team = submission.teamRequestData.team;
        request = {
          id: submission.teamRequestData.id,
          team: {
            id: team.id,
            name: team.name,
            aliases: team.aliases || [],
            description: team.description || '',
            members: team.members || [],
            createdAt: team.createdAt,
            updatedAt: team.updatedAt,
            credits: {
              totalLevels: team.levels?.length || 0,
              memberCount: team.members?.length || 0
            }
          },
          teamId: team.id,
          teamName: team.name
        };
      } else if (submission.teamRequestData?.isNewRequest) {
        // For new team requests, pass the requested team name and request ID
        request = {
          id: submission.teamRequestData.id,
          teamName: submission.teamRequestData.teamName,
          isNewRequest: true
        };
      }
    } else {
      // For creator requests
      if (request?.creator) {
        // Ensure we have the correct credit stats format for existing creators
        const credits = request.creator.credits || {};
        request = {
          ...request,
          creator: {
            ...request.creator,
            credits: {
              charterCount: credits.charterCount || 0,
              vfxerCount: credits.vfxerCount || 0,
              totalCredits: credits.totalCredits || 0,
              totalLevels: request.creator.credits?.length || 0,
            },
            aliases: request.creator.creatorAliases?.map(alias => alias.name) || [],
            isVerified: request.creator.isVerified || false
          }
        };
      } else if (request?.isNewRequest) {
        // For new creator requests, ensure we pass the ID
        request = {
          ...request,
          creatorName: request.creatorName,
          isNewRequest: true
        };
      }
    }
    
    
    setSelectedSubmission(submission);
    setSelectedCreatorRequest(request);
    setSelectedRole(role);
    setShowCreatorPopup(true);
  };

  const handleCreatorPopupClose = () => {
    setSelectedSubmission(null);
    setSelectedCreatorRequest(null);
    setSelectedRole(null);
    setShowCreatorPopup(null);
  };

  const handleCreatorUpdate = async (updatedData) => {
    if (!selectedSubmission) return;

    // Update the submission in the list with the returned data
    setSubmissions(prevSubmissions => prevSubmissions.map(submission => {
      if (submission.id !== selectedSubmission.id) return submission;
      // Merge response data with existing submission to preserve all fields
      return {
        ...submission,
        ...updatedData,
        // Preserve nested objects that might not be in response
        songObject: updatedData.songObject || submission.songObject,
        artistObject: updatedData.artistObject || submission.artistObject,
        songRequest: updatedData.songRequest || submission.songRequest,
        artistRequest: updatedData.artistRequest || submission.artistRequest,
        evidence: updatedData.evidence || submission.evidence,
        levelSubmitter: updatedData.levelSubmitter || submission.levelSubmitter
      };
    }));
    // Close the creator popup
    setShowCreatorPopup(false);
    setSelectedSubmission(null);
    setSelectedCreatorRequest(null);
    setSelectedRole(null);
  };

  const handleAddCreator = async (submissionId, role) => {
    try {
      const response = await api.post(
        `${import.meta.env.VITE_SUBMISSION_API}/levels/${submissionId}/creator-requests`,
        { role }
      );
      
      // Update the submissions list with the new data
      setSubmissions(prevSubmissions => prevSubmissions.map(submission => {
        if (submission.id === submissionId) {
          // Merge response data with existing submission to preserve all fields
          return {
            ...submission,
            ...response.data,
            // Preserve nested objects that might not be in response
            songObject: response.data.songObject || submission.songObject,
            artistObject: response.data.artistObject || submission.artistObject,
            songRequest: response.data.songRequest || submission.songRequest,
            artistRequest: response.data.artistRequest || submission.artistRequest,
            teamRequestData: response.data.teamRequestData || submission.teamRequestData,
            evidence: response.data.evidence || submission.evidence,
            levelSubmitter: response.data.levelSubmitter || submission.levelSubmitter
          };
        }
        return submission;
      }));
    } catch (error) {
      console.error('Error adding creator:', error);
      toast.error(t('levelSubmissions.errors.addCreatorFailed'));
    }
  };

  const handleSongSelect = async (songData) => {
    if (!selectedSongSubmission) return;
    
    try {
      const submission = submissions.find(s => s.id === selectedSongSubmission.id);
      
      // Case 1: If song is set (songId exists), clear all artist requests BEFORE setting the song
      // This discards artist state as requested
      if (songData.songId && submission?.artistRequests && submission.artistRequests.length > 0) {
        // Delete all artist requests before setting the song (discard artist state)
        const deletePromises = submission.artistRequests.map(artistRequest => 
          api.delete(
            `${import.meta.env.VITE_SUBMISSION_API}/levels/${selectedSongSubmission.id}/artist-requests/${artistRequest.id}`
          ).catch(err => {
            // Log error but continue - if deletion fails, we'll refresh after song is set anyway
            console.error('Error deleting artist request:', err);
          })
        );
        await Promise.all(deletePromises);
      }
      
      // Ensure songId is explicitly null when creating a new request
      const requestData = {
        songName: songData.songName,
        isNewRequest: songData.isNewRequest || false,
        verificationState: songData.verificationState || (songData.isNewRequest ? 'pending' : null)
      };
      
      // Only include songId if it's not a new request
      if (!songData.isNewRequest && songData.songId) {
        requestData.songId = songData.songId;
      } else {
        requestData.songId = null;
      }
      
      const response = await api.put(
        `${import.meta.env.VITE_SUBMISSION_API}/levels/${selectedSongSubmission.id}/song`,
        requestData
      );
      
      // If a song was assigned (songId exists), refresh to get full songObject with credits
      // Otherwise, just merge the response
      if (songData.songId) {
        await fetchPendingSubmissions();
      } else {
        setSubmissions(prevSubmissions => prevSubmissions.map(submission => {
          if (submission.id === selectedSongSubmission.id) {
            // Merge response data with existing submission to preserve all fields
            const updatedSubmission = {
              ...submission,
              ...response.data,
              // Clear artist requests when song is set (case 1)
              artistRequests: songData.songId ? [] : (response.data.artistRequests || submission.artistRequests),
              // Preserve nested objects that might not be in response
              creatorRequests: response.data.creatorRequests || submission.creatorRequests,
              teamRequestData: response.data.teamRequestData || submission.teamRequestData,
              evidence: response.data.evidence || submission.evidence,
              levelSubmitter: response.data.levelSubmitter || submission.levelSubmitter,
              artistObject: response.data.artistObject || submission.artistObject
            };
            
            // For new requests, ensure songId and songObject are cleared
            if (songData.isNewRequest) {
              updatedSubmission.songId = null;
              updatedSubmission.songObject = null;
            } else {
              updatedSubmission.songObject = response.data.songObject || submission.songObject;
            }
            
            return updatedSubmission;
          }
          return submission;
        }));
      }
      
      toast.success(t('levelSubmissions.messages.songUpdated'));
      setShowSongSelector(false);
      setSelectedSongSubmission(null);
    } catch (error) {
      console.error('Error updating song:', error);
      toast.error(error.response?.data?.error || t('levelSubmissions.errors.updateSongFailed'));
    }
  };

  const handleArtistAction = (submission, artistRequest) => {
    // Format artist request data similar to creator requests
    if (artistRequest?.artist) {
      // Existing artist assigned
      artistRequest = {
        ...artistRequest,
        artist: {
          ...artistRequest.artist,
          aliases: artistRequest.artist.artistAliases?.map(alias => alias.name) || [],
          isVerified: artistRequest.artist.isVerified || false
        }
      };
    } else if (artistRequest?.isNewRequest) {
      // New artist request
      artistRequest = {
        ...artistRequest,
        artistName: artistRequest.artistName,
        isNewRequest: true,
        verificationState: artistRequest.verificationState || null
      };
    }
    
    setSelectedArtistSubmission(submission);
    setSelectedArtistRequest(artistRequest);
    setShowArtistSelector(true);
  };

  const handleArtistSelectorClose = () => {
    setSelectedArtistSubmission(null);
    setSelectedArtistRequest(null);
    setShowArtistSelector(false);
  };

  const handleArtistSelect = async (artistData) => {
    if (!selectedArtistSubmission) return;
    
    try {
      const submission = submissions.find(s => s.id === selectedArtistSubmission.id);
      
      // Case 2: If artist is set and no song exists, create a song request
      if (!submission?.songId && !submission?.songRequest) {
        try {
          await api.post(
            `${import.meta.env.VITE_SUBMISSION_API}/levels/${selectedArtistSubmission.id}/song-requests`
          );
        } catch (error) {
          // If song request creation fails, log but continue with artist update
          console.error('Error creating song request:', error);
        }
      }
      
      // If we have a selected artist request, update it; otherwise assign new
      const artistRequestId = selectedArtistRequest?.id || artistData.artistRequestId || null;
      
      const response = await api.put(
        `${import.meta.env.VITE_SUBMISSION_API}/levels/${selectedArtistSubmission.id}/artist`,
        {
          artistId: artistData.artistId || null,
          artistRequestId: artistRequestId,
          artistName: artistData.artistName,
          isNewRequest: artistData.isNewRequest || false,
          requiresEvidence: artistData.isNewRequest 
            ? (artistData.verificationState === 'declined' || artistData.verificationState === 'mostly_declined')
            : (artistData.requiresEvidence || false),
          verificationState: artistData.verificationState || null
        }
      );
      
      setSubmissions(prevSubmissions => prevSubmissions.map(submission => {
        if (submission.id === selectedArtistSubmission.id) {
          // Merge response data with existing submission to preserve all fields
          return {
            ...submission,
            ...response.data,
            // Preserve nested objects that might not be in response
            creatorRequests: response.data.creatorRequests || submission.creatorRequests,
            teamRequestData: response.data.teamRequestData || submission.teamRequestData,
            artistRequests: response.data.artistRequests || submission.artistRequests,
            songObject: response.data.songObject || submission.songObject,
            songRequest: response.data.songRequest || submission.songRequest,
            evidence: response.data.evidence || submission.evidence,
            levelSubmitter: response.data.levelSubmitter || submission.levelSubmitter
          };
        }
        return submission;
      }));
      
      toast.success(t('levelSubmissions.messages.artistUpdated'));
      handleArtistSelectorClose();
    } catch (error) {
      console.error('Error updating artist:', error);
      toast.error(error.response?.data?.error || t('levelSubmissions.errors.updateArtistFailed'));
    }
  };

  const handleSaveSuffix = async (submissionId) => {
    const newSuffix = (suffixValues[submissionId] || '').trim();
    const currentSuffix = submissions.find(s => s.id === submissionId)?.suffix || '';
    
    // Only update if value changed
    if (newSuffix !== currentSuffix) {
      try {
        const response = await api.put(
          `${import.meta.env.VITE_SUBMISSION_API}/levels/${submissionId}/suffix`,
          { suffix: newSuffix }
        );
        setSubmissions(prevSubmissions => prevSubmissions.map(s => 
          s.id === submissionId ? { ...s, ...response.data } : s
        ));
        toast.success(t('levelSubmissions.messages.suffixUpdated'));
      } catch (error) {
        console.error('Error updating suffix:', error);
        toast.error(t('levelSubmissions.errors.suffixUpdateFailed'));
      }
    }
    
    // Exit edit mode
    setEditingSuffix(prev => {
      const newState = { ...prev };
      delete newState[submissionId];
      return newState;
    });
    setSuffixValues(prev => {
      const newState = { ...prev };
      delete newState[submissionId];
      return newState;
    });
  };

  const handleCancelSuffix = (submissionId) => {
    setEditingSuffix(prev => {
      const newState = { ...prev };
      delete newState[submissionId];
      return newState;
    });
    setSuffixValues(prev => {
      const newState = { ...prev };
      delete newState[submissionId];
      return newState;
    });
  };

  const handleRemoveCreator = async (submissionId, requestId) => {
    try {
      const response = await api.delete(
        `${import.meta.env.VITE_SUBMISSION_API}/levels/${submissionId}/creator-requests/${requestId}`
      );
      
      // Update the submissions list with the new data
      setSubmissions(prevSubmissions => prevSubmissions.map(submission => {
        if (submission.id === submissionId) {
          // Merge response data with existing submission to preserve all fields
          return {
            ...submission,
            ...response.data,
            // Preserve nested objects that might not be in response
            songObject: response.data.songObject || submission.songObject,
            artistObject: response.data.artistObject || submission.artistObject,
            songRequest: response.data.songRequest || submission.songRequest,
            artistRequest: response.data.artistRequest || submission.artistRequest,
            teamRequestData: response.data.teamRequestData || submission.teamRequestData,
            evidence: response.data.evidence || submission.evidence,
            levelSubmitter: response.data.levelSubmitter || submission.levelSubmitter
          };
        }
        return submission;
      }));
    } catch (error) {
      console.error('Error removing creator:', error);
      if (error.response?.status === 400) {
        toast.error(t('levelSubmissions.errors.cannotRemoveLastCharter'));
      } else {
        toast.error(t('levelSubmissions.errors.removeCreatorFailed'));
      }
    }
  };

  const handleSongAction = async (submission) => {
    // If we have songObject, use it directly
    if (submission.songObject) {
      setSelectedSongForManagement(submission);
      setShowSongManagement(true);
      return;
    }

    // If we only have songId, fetch the full song data
    if (submission.songId) {
      try {
        const response = await api.get(
          `${import.meta.env.VITE_API_URL}/v2/database/songs/${submission.songId}`
        );
        setSelectedSongForManagement({
          ...submission,
          songObject: response.data
        });
        setShowSongManagement(true);
      } catch (error) {
        console.error('Error fetching song:', error);
        toast.error(error.response?.data?.error || t('levelSubmissions.errors.updateSongFailed'));
      }
    }
  };

  const handleArtistEntityAction = async (submission) => {
    // If we have artistObject, use it directly
    if (submission.artistObject) {
      setSelectedArtistForManagement(submission);
      setShowArtistManagement(true);
      return;
    }

    // If we only have artistId, fetch the full artist data
    if (submission.artistId) {
      try {
        const response = await api.get(
          `${import.meta.env.VITE_API_URL}/v2/database/artists/${submission.artistId}`
        );
        setSelectedArtistForManagement({
          ...submission,
          artistObject: response.data
        });
        setShowArtistManagement(true);
      } catch (error) {
        console.error('Error fetching artist:', error);
        toast.error(error.response?.data?.error || t('levelSubmissions.errors.updateArtistFailed'));
      }
    }
  };

  const handleSongManagementClose = () => {
    setSelectedSongForManagement(null);
    setShowSongManagement(false);
  };

  const handleArtistManagementClose = () => {
    setSelectedArtistForManagement(null);
    setShowArtistManagement(false);
  };

  const handleSongManagementUpdate = async () => {
    if (!selectedSongForManagement) return;
    await fetchPendingSubmissions();
    handleSongManagementClose();
  };

  const handleArtistManagementUpdate = async () => {
    if (!selectedArtistForManagement) return;
    await fetchPendingSubmissions();
    handleArtistManagementClose();
  };

  const handleAddSongRequest = async (submissionId) => {
    try {
      const response = await api.post(
        `${import.meta.env.VITE_SUBMISSION_API}/levels/${submissionId}/song-requests`
      );
      
      setSubmissions(prevSubmissions => prevSubmissions.map(submission => {
        if (submission.id === submissionId) {
          // Merge response data with existing submission to preserve all fields
          return {
            ...submission,
            ...response.data,
            // Preserve nested objects that might not be in response
            creatorRequests: response.data.creatorRequests || submission.creatorRequests,
            teamRequestData: response.data.teamRequestData || submission.teamRequestData,
            artistObject: response.data.artistObject || submission.artistObject,
            artistRequest: response.data.artistRequest || submission.artistRequest,
            evidence: response.data.evidence || submission.evidence,
            levelSubmitter: response.data.levelSubmitter || submission.levelSubmitter
          };
        }
        return submission;
      }));
      toast.success(t('levelSubmissions.messages.songRequestAdded'));
    } catch (error) {
      console.error('Error adding song request:', error);
      toast.error(error.response?.data?.error || t('levelSubmissions.errors.addSongRequestFailed'));
    }
  };

  const handleAddArtistRequest = async (submissionId) => {
    try {
      const response = await api.post(
        `${import.meta.env.VITE_SUBMISSION_API}/levels/${submissionId}/artist-requests`
      );
      
      setSubmissions(prevSubmissions => prevSubmissions.map(submission => {
        if (submission.id === submissionId) {
          // Merge response data with existing submission to preserve all fields
          return {
            ...submission,
            ...response.data,
            // Preserve nested objects that might not be in response
            creatorRequests: response.data.creatorRequests || submission.creatorRequests,
            teamRequestData: response.data.teamRequestData || submission.teamRequestData,
            songObject: response.data.songObject || submission.songObject,
            songRequest: response.data.songRequest || submission.songRequest,
            artistRequests: response.data.artistRequests || submission.artistRequests,
            evidence: response.data.evidence || submission.evidence,
            levelSubmitter: response.data.levelSubmitter || submission.levelSubmitter
          };
        }
        return submission;
      }));
      toast.success(t('levelSubmissions.messages.artistRequestAdded'));
    } catch (error) {
      console.error('Error adding artist request:', error);
      toast.error(error.response?.data?.error || t('levelSubmissions.errors.addArtistRequestFailed'));
    }
  };

  const handleRemoveArtistRequest = async (submissionId, artistRequestId) => {
    try {
      const response = await api.delete(
        `${import.meta.env.VITE_SUBMISSION_API}/levels/${submissionId}/artist-requests/${artistRequestId}`
      );
      
      setSubmissions(prevSubmissions => prevSubmissions.map(submission => {
        if (submission.id === submissionId) {
          return {
            ...submission,
            ...response.data,
            artistRequests: response.data.artistRequests || submission.artistRequests?.filter(
              req => req.id !== artistRequestId
            ),
            creatorRequests: response.data.creatorRequests || submission.creatorRequests,
            teamRequestData: response.data.teamRequestData || submission.teamRequestData,
            songObject: response.data.songObject || submission.songObject,
            songRequest: response.data.songRequest || submission.songRequest,
            evidence: response.data.evidence || submission.evidence,
            levelSubmitter: response.data.levelSubmitter || submission.levelSubmitter
          };
        }
        return submission;
      }));
      toast.success(t('levelSubmissions.messages.artistRequestRemoved'));
    } catch (error) {
      console.error('Error removing artist request:', error);
      toast.error(error.response?.data?.error || t('levelSubmissions.errors.removeArtistRequestFailed'));
    }
  };

  if (submissions?.length === 0 && !isLoading) {
    return <p className="no-submissions">{t('levelSubmissions.noSubmissions')}</p>;
  }

  return (
    <>
      <div className="submissions-list">  
        {isLoading ? (  
          <div className="loader loader-submission-detail"/>
        ) : (
          submissions.map((submission) => (
            <div 
              key={submission.id} 
              className={`submission-card ${animatingCards[submission.id] || ''}`}
            >
              <div className="submission-header">
                <h3>
                  {submission.songObject?.name || submission.song}
                  {submission.songRequest?.isNewRequest && (
                    <span className="request-badge">{t('levelSubmissions.badges.newRequest')}</span>
                  )}
                </h3>
                <span className="submission-date">
                  {formatDate(submission.createdAt, i18next?.language)}
                </span>
              </div>
              
              <div className="card-content">
                <div className="submission-details">
                  {/* Song Management */}
                  <div className="detail-row">
                    <span className="detail-label">{t('levelSubmissions.details.song')}</span>
                    <div className="detail-value-group">
                      <span className="detail-value">
                        {submission.songObject?.name || submission.song}
                        {submission.songRequest?.isNewRequest && (
                          <span className="request-badge">{t('levelSubmissions.badges.newRequest')}</span>
                        )}
                        {!submission.songId && !submission.songRequest && (
                          <span className="profile-request-unassigned" title={t('levelSubmissions.badges.unassigned')}>
                            <WarningIcon className="warning-icon" color="#f00" />
                          </span>
                        )}
                      </span>
                      <div className="entity-actions">
                        {(submission.songObject || submission.songId || submission.songRequest) && (
                          <button
                            className="change-entity-button"
                            onClick={() => {
                              setSelectedSongSubmission(submission);
                              setShowSongSelector(true);
                            }}
                          >
                            {t('levelSubmissions.buttons.changeSong')}
                          </button>
                        )}
                        {(submission.songObject || submission.songId) && (submission.artistObject || submission.artistId) && (
                          <button
                            className="manage-entity-button"
                            onClick={() => handleSongAction(submission)}
                            title={!(submission.artistObject || submission.artistId) ? t('levelSubmissions.errors.needArtistForSong') : ''}
                          >
                            {t('levelSubmissions.buttons.manageSong')}
                          </button>
                        )}
                        {!submission.songRequest && (
                          <button
                            className="add-entity-request-button"
                            onClick={() => handleAddSongRequest(submission.id)}
                          >
                            {t('levelSubmissions.buttons.addSongRequest')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Artist Management */}
                  {submission.songId && submission.songObject ? (
                    <div className="creator-group">
                      <div className="creator-group-header">
                        {t('levelSubmissions.details.artist')}
                      </div>
                      <div className="creator-list">
                        {submission.songObject.credits && submission.songObject.credits.length > 0 ? (
                          submission.songObject.credits.map((credit, idx) => (
                            <div key={credit.artist?.id || idx} className="creator-item">
                              <span className="creator-name">
                                {credit.artist?.name || 'Unknown'}
                                <span className="locked-indicator" title={t('levelSubmissions.messages.artistLockedToSong')}>
                                  {' '}(Locked)
                                </span>
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="creator-item">
                            <span className="profile-request-unassigned" title={t('levelSubmissions.badges.unassigned')}>
                              <WarningIcon className="warning-icon" color="#f00" />
                              {t('levelSubmissions.badges.unassigned')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="creator-group">
                      <div className="creator-group-header">
                        {t('levelSubmissions.details.artist')}
                      </div>
                      <div className="creator-list">
                        {submission.artistRequests && submission.artistRequests.length > 0 ? (
                          submission.artistRequests.map((artistRequest, idx) => (
                            <div key={artistRequest.id || idx} className="creator-item">
                              <span className={`creator-name ${artistRequest.isNewRequest ? 'pending' : ''}`}>
                                {artistRequest.artist?.name || artistRequest.artistName || 'Unknown'}
                                {artistRequest.isNewRequest && (
                                  <span className="profile-request-badge">
                                    {t('levelSubmissions.badges.newRequest')}
                                  </span>
                                )}
                                {!artistRequest.artistId && !artistRequest.isNewRequest && (
                                  <span className="profile-request-unassigned" title={t('levelSubmissions.badges.unassigned')}>
                                    <WarningIcon className="warning-icon" color="#f00" />
                                  </span>
                                )}
                              </span>
                              <div className="creator-actions">
                                {/* Show remove button if there's more than one artist */}
                                {submission.artistRequests.length > 1 && (
                                  <button
                                    className="remove-creator-button"
                                    onClick={() => handleRemoveArtistRequest(submission.id, artistRequest.id)}
                                  >
                                    {t('levelSubmissions.buttons.remove')}
                                  </button>
                                )}
                                <button
                                  className="manage-creator-button"
                                  onClick={() => handleArtistAction(submission, artistRequest)}
                                >
                                  {t('levelSubmissions.buttons.manageArtist')}
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="creator-item">
                            <span className="profile-request-unassigned" title={t('levelSubmissions.badges.unassigned')}>
                              <WarningIcon className="warning-icon" color="#f00" />
                              {t('levelSubmissions.badges.unassigned')}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="add-creator-button-container">
                        <button
                          className="add-creator-button"
                          onClick={() => handleAddArtistRequest(submission.id)}
                        >
                          {t('levelSubmissions.buttons.addArtistRequest')}
                        </button>
                      </div>
                    </div>
                  )}
                  
                      {/* Evidence Display */}
                      {submission.evidence && submission.evidence.length > 0 && (
                    <div className="detail-row">
                      <span className="detail-label">{t('levelSubmissions.details.evidence')}</span>
                      <div className="evidence-preview">
                        {submission.evidence.slice(0, 3).map((evidence, index) => {
                          const isImage = isImageUrl(evidence.link);
                          const title = evidence.extraInfo 
                            ? `${evidence.link}\n\n${evidence.extraInfo}` 
                            : evidence.link;
                          return isImage ? (
                            <img
                              key={evidence.id}
                              src={evidence.link}
                              alt={`Evidence ${index + 1}`}
                              className="evidence-thumbnail"
                              onClick={() => {
                                setSelectedEvidenceSubmission(submission);
                                setShowEvidenceGallery(true);
                              }}
                              title={title}
                            />
                          ) : (
                            <div
                              key={evidence.id}
                              className="evidence-thumbnail evidence-link-thumbnail"
                              onClick={() => {
                                setSelectedEvidenceSubmission(submission);
                                setShowEvidenceGallery(true);
                              }}
                              title={title}
                            >
                              <span className="evidence-link-icon">🔗</span>
                              {evidence.extraInfo && (
                                <span className="evidence-extra-info-indicator" title={evidence.extraInfo}>ℹ️</span>
                              )}
                            </div>
                          );
                        })}
                        {submission.evidence.length > 3 && (
                          <span
                            className="evidence-count clickable"
                            onClick={() => {
                              setSelectedEvidenceSubmission(submission);
                              setShowEvidenceGallery(true);
                            }}
                          >
                            +{submission.evidence.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <br/>
                  <div className="detail-row">
                    <span className="detail-label">{t('levelSubmissions.details.suffix')}</span>
                    <div className="detail-value-group suffix-edit-group">
                      {editingSuffix[submission.id] ? (
                        <div className="suffix-edit-controls">
                          <input
                            type="text"
                            className="suffix-input"
                            value={suffixValues[submission.id] ?? (submission.suffix || '')}
                            onChange={(e) => {
                              setSuffixValues(prev => ({
                                ...prev,
                                [submission.id]: e.target.value
                              }));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveSuffix(submission.id);
                              } else if (e.key === 'Escape') {
                                handleCancelSuffix(submission.id);
                              }
                            }}
                            placeholder={t('levelSubmissions.details.suffixPlaceholder')}
                            autoFocus
                          />
                          <div className="suffix-edit-buttons">
                            <button
                              className="suffix-save-btn"
                              onClick={() => handleSaveSuffix(submission.id)}
                              title={t('buttons.save', { ns: 'common' })}
                            >
                              ✓
                            </button>
                            <button
                              className="suffix-cancel-btn"
                              onClick={() => handleCancelSuffix(submission.id)}
                              title={t('buttons.cancel', { ns: 'common' })}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="suffix-display">
                          <span className="detail-value">
                            {submission.suffix || <span style={{opacity: 0.5}}>{t('levelSubmissions.details.suffixPlaceholder')}</span>}
                          </span>
                          <button
                            className="suffix-edit-btn"
                            onClick={() => {
                              setEditingSuffix(prev => ({ ...prev, [submission.id]: true }));
                              setSuffixValues(prev => ({
                                ...prev,
                                [submission.id]: submission.suffix || ''
                              }));
                            }}
                            title={t('buttons.edit', { ns: 'common' })}
                          >
                            ✏️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">{t('levelSubmissions.details.difficulty')}</span>
                    <span className="detail-value">{submission.diff}</span>
                  </div>

                  {submission.directDL ? (
                    <div className="detail-row">
                      <span className="detail-label">{t('levelSubmissions.details.download.label')}</span>
                      <a 
                        href={submission.directDL} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="detail-link"
                      >
                        {t('levelSubmissions.details.download.directLink')}
                        {submission.directDL.includes(import.meta.env.VITE_CDN_URL) && (
                          <ServerCloudIcon size="24px" color="#aaffaa" 
                            data-tooltip-id="cdn-tooltip"
                          />
                        )}
                        <Tooltip className="cdn-tooltip" id="cdn-tooltip" place="right">
                          {t('levelSubmissions.details.download.cdnLink')}
                        </Tooltip>
                      </a>
                    </div>
                  ) : (
                    <div className="detail-row">
                      <span className="detail-label">{t('levelSubmissions.details.download.label')}</span>
                      <span className="detail-value" style={{color: "rgb(255, 100, 100)"}}>
                        {t('levelSubmissions.details.download.notAvailable')}
                      </span>
                    </div>
                  )}

                  {submission.wsLink && (
                    <div className="detail-row">
                      <span className="detail-label">{t('levelSubmissions.details.workshop.label')}</span>
                      <a 
                        href={submission.wsLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="detail-link"
                      >
                        {t('levelSubmissions.details.workshop.link')}
                      </a>
                    </div>
                  )}

                  <div className="detail-row">
                    <span className="detail-label">{t('levelSubmissions.details.submitter')}</span>
                    <div className="submitter-details">
                      <span className="detail-value">{submission.submitterDiscordUsername? `@${submission.submitterDiscordUsername}` : submission.levelSubmitter?.username || "Null"}</span>
                      <span className="detail-subvalue">#{submission.levelSubmitter?.playerId || "Null"}</span>
                    </div>
                    {submission.levelSubmitter && (
                      <CreatorIcon
                        className={`creator-assignment-button ${submission.levelSubmitter?.creator ? 'has-creator' : 'no-creator'}`}
                        onClick={() => setShowCreatorAssignmentModal(prev => ({ ...prev, [submission.id]: true }))}
                        title={submission.levelSubmitter?.creator ? 'Creator assigned' : 'No creator assigned'}
                      />
                    )}
                  </div>
                  {showCreatorAssignmentModal[submission.id] && submission.levelSubmitter && (
                    <CreatorAssignmentPopup
                      user={submission.levelSubmitter}
                      onClose={() => setShowCreatorAssignmentModal(prev => {
                        const newState = { ...prev };
                        delete newState[submission.id];
                        return newState;
                      })}
                      onUpdate={(updatedUser) => {
                        // Update all submissions with matching user ID in place
                        if (updatedUser) {
                          setSubmissions(prevSubmissions => prevSubmissions.map(sub => {
                            if (sub.levelSubmitter?.id === updatedUser.id) {
                              return {
                                ...sub,
                                levelSubmitter: {
                                  ...sub.levelSubmitter,
                                  creatorId: updatedUser.creatorId,
                                  creator: updatedUser.creator || null
                                }
                              };
                            }
                            return sub;
                          }));
                        }
                      }}
                    />
                  )}

                  {/* Group Creator Requests by Role */}
                  {(() => {
                    // Group creators by role
                    const creatorsByRole = submission.creatorRequests?.reduce((acc, request) => {
                      if (!acc[request.role]) {
                        acc[request.role] = [];
                      }
                      acc[request.role].push(request);
                      return acc;
                    }, {});

                    return Object.entries(creatorsByRole || {}).map(([role, creators]) => (
                      <div key={role} className="creator-group">
                        <div className="creator-group-header">
                          {t(`levelSubmissions.details.${role}`)}
                        </div>
                        <div className="creator-list">
                          {creators.map((request, index) => (
                            <div key={index} className="creator-item">
                              <span className={`creator-name ${request.isNewRequest ? 'pending' : ''}`}>
                                {request.creatorName}
                                {request.isNewRequest && (
                                  <span className="profile-request-badge">
                                    {t('levelSubmissions.badges.newRequest')}
                                  </span>
                                )}
                                {!request.creatorId && !request.isNewRequest && (
                                  <span className="profile-request-unassigned" title={t('levelSubmissions.badges.unassigned')}>
                                    <WarningIcon className="warning-icon" color="#f00" />
                                  </span>
                                )}
                              </span>
                              <div className="creator-actions">
                                {/* Show remove button for vfxers or if there's more than one charter */}
                                {(request.role === 'vfxer' || 
                                  (request.role === 'charter' && 
                                    creators.filter(r => r.role === 'charter').length > 1)) && (
                                  <button
                                    className="remove-creator-button"
                                    onClick={() => handleRemoveCreator(submission.id, request.id)}
                                  >
                                    {t('levelSubmissions.buttons.remove')}
                                  </button>
                                )}
                                <button
                                  className="manage-creator-button"
                                  onClick={() => handleCreatorAction(submission, request, request.role)}
                                >
                                  {t('levelSubmissions.buttons.manageCreator')}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Only show add button for charter and vfxer roles */}
                        {role !== 'team' && (
                          <div className="add-creator-button-container">
                            <button
                              className="add-creator-button"
                              onClick={() => handleAddCreator(submission.id, role)}
                            >
                              {t('levelSubmissions.buttons.addCreator', { role })}
                            </button>
                          </div>
                        )}
                      </div>
                    ));
                  })()}

                  {/* Team Request */}
                  <div className="creator-group">
                    <div className="creator-group-header">
                      {t('levelSubmissions.details.team')}
                    </div>
                    <div className="creator-list">
                      {submission.teamRequestData ? (
                        <div className="creator-item">
                          <span className={`creator-name ${submission.teamRequestData.isNewRequest ? 'pending' : ''}`}>
                            {submission.teamRequestData.teamName}
                            {submission.teamRequestData.isNewRequest && (
                              <span className="profile-request-badge">
                                {t('levelSubmissions.badges.newRequest')}
                              </span>
                            )}
                            {!submission.teamRequestData.teamId && !submission.teamRequestData.isNewRequest && (
                              <span className="profile-request-badge unassigned" title={t('levelSubmissions.badges.unassigned')}>
                                <WarningIcon className="warning-icon" color="#f00" />
                              </span>
                            )}
                          </span>
                          <div className="creator-actions">
                            <button
                              className="remove-creator-button"
                              onClick={() => handleRemoveCreator(submission.id, submission.teamRequestData.id)}
                            >
                              {t('levelSubmissions.buttons.remove')}
                            </button>
                            <button
                              className="manage-creator-button"
                              onClick={() => handleCreatorAction(submission, submission.teamRequestData, 'team')}
                            >
                              {t('levelSubmissions.buttons.manageTeam')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="add-creator-button-container">
                          <button
                            className="add-creator-button"
                            onClick={() => handleAddCreator(submission.id, 'team')}
                          >
                            {t('levelSubmissions.buttons.addTeam')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

              

                  <div className="action-buttons">
                    <button 
                      onClick={() => handleSubmission(submission.id, 'approve')}
                      className="approve-btn"
                      disabled={disabledButtons[submission.id] || !canBeApproved(submission)}
                      title={!canBeApproved(submission) ? (
                        !(submission.songObject || submission.songId)
                          ? t('levelSubmissions.errors.needSongAndArtist')
                          : (!(submission.songId && submission.songObject?.credits) && 
                             !(submission.artistObject || submission.artistId) && 
                             (!submission.artistRequests || submission.artistRequests.length === 0))
                            ? t('levelSubmissions.errors.needSongAndArtist')
                            : t('levelSubmissions.errors.needProfiles')
                      ) : ''}
                    >
                      {t('levelSubmissions.buttons.allow')}
                    </button>
                    <button 
                      onClick={() => handleSubmission(submission.id, 'decline')}
                      className="decline-btn"
                      disabled={disabledButtons[submission.id]}
                    >
                      {t('levelSubmissions.buttons.decline')}
                    </button>
                  </div>
                </div>

                <div className="embed-container">
                  {videoEmbeds[submission.id] ? (
                    <iframe
                      src={videoEmbeds[submission.id].embed}
                      title="Video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <div
                      className="thumbnail-container"
                      style={{
                        backgroundImage: `url(${videoEmbeds[submission.id]?.image || placeholder})`,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )))}
      </div>

      {showCreatorPopup && selectedSubmission && (
        <SubmissionCreatorPopup
          submission={selectedSubmission}
          onClose={handleCreatorPopupClose}
          onUpdate={handleCreatorUpdate}
          initialRole={selectedRole}
          initialRequest={selectedCreatorRequest}
        />
      )}

      {profileCreation.show && (
        <ProfileCreationModal
          profiles={profileCreation.profiles}
          onComplete={handleProfileCreationComplete}
          onCancel={handleProfileCreationCancel}
        />
      )}

      {/* Song Selector Popup */}
      {showSongSelector && selectedSongSubmission && (
        <SongSelectorPopup
          onClose={() => {
            setShowSongSelector(false);
            setSelectedSongSubmission(null);
          }}
          onSelect={handleSongSelect}
          initialSong={selectedSongSubmission.songObject || (selectedSongSubmission.songRequest ? {
            name: selectedSongSubmission.songRequest.songName || selectedSongSubmission.song,
            isNewRequest: true,
            verificationState: selectedSongSubmission.songRequest.verificationState || 'pending',
            songId: null // Explicitly null for new requests
          } : null)}
        />
      )}

      {/* Artist Selector Popup */}
      {showArtistSelector && selectedArtistSubmission && (
        <ArtistSelectorPopup
          onClose={handleArtistSelectorClose}
          onSelect={handleArtistSelect}
          initialArtist={selectedArtistRequest?.artist || (selectedArtistRequest?.isNewRequest ? {
            name: selectedArtistRequest.artistName,
            isNewRequest: true,
            verificationState: selectedArtistRequest.verificationState || null
          } : (selectedArtistSubmission.artistObject || (selectedArtistSubmission.artistRequest ? {
            name: selectedArtistSubmission.artist,
            isNewRequest: true
          } : null)))}
        />
      )}

      {/* Song Management Popup */}
      {showSongManagement && selectedSongForManagement && selectedSongForManagement.songObject && (
        <EntityActionPopup
          song={selectedSongForManagement.songObject}
          onClose={handleSongManagementClose}
          onUpdate={handleSongManagementUpdate}
          type="song"
        />
      )}

      {/* Artist Management Popup */}
      {showArtistManagement && selectedArtistForManagement && selectedArtistForManagement.artistObject && (
        <EntityActionPopup
          artist={selectedArtistForManagement.artistObject}
          onClose={handleArtistManagementClose}
          onUpdate={handleArtistManagementUpdate}
          type="artist"
        />
      )}

      {/* Evidence Gallery Popup */}
      {showEvidenceGallery && selectedEvidenceSubmission && (
        <EvidenceGalleryPopup
          evidence={selectedEvidenceSubmission.evidence || []}
          onClose={() => {
            setShowEvidenceGallery(false);
            setSelectedEvidenceSubmission(null);
          }}
        />
      )}
    </>
  );
};

export default LevelSubmissions;