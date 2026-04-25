import "./adminpage.css"

import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next";
import { MetaTags } from "@/components/common/display";

const AdminPage = () => {
  const {t} = useTranslation('pages')
  const location = useLocation();
  const currentUrl = window.location.origin + location.pathname;

  const adminLinks = [
    {
      id: 'rating',
      path: '/rating',
      title: t("admin.links.rating"),
      description: t("admin.links.ratingDesc"),
      icon: "📝"
    },
    {
      id: 'submissions',
      path: '/admin/submissions',
      title: t("admin.links.submissions"),
      description: t("admin.links.submissionsDesc"),
      icon: "📩"
    },
    {
      id: 'announcements',
      path: '/admin/announcements',
      title: t("admin.links.announcements"),
      description: t("admin.links.announcementsDesc"),
      icon: "📢"
    },
    {
      id: 'difficulties',
      path: '/admin/difficulties',
      title: t("admin.links.difficulties"),
      description: t("admin.links.difficultiesDesc"),
      icon: "🎯"
    },
    {
      id: 'creators',
      path: '/admin/creators',
      title: t("admin.links.creators"),
      description: t("admin.links.creatorsDesc"),
      icon: "🛠"
    },
    {
      id: 'backups',
      path: '/admin/backups',
      title: t("admin.links.backups"),
      description: t("admin.links.backupsDesc"),
      icon: "💾"
    },
    {
      id: 'audit-log',
      path: '/admin/audit-log',
      title: t("admin.links.auditLog"),
      description: t("admin.links.auditLogDesc"),
      icon: "🔍"
    },
    {
      id: 'curations',
      path: '/admin/curations',
      title: t("admin.links.curations"),
      description: t("admin.links.curationsDesc"),
      icon: "🏆"
    },
    {
      id: 'song-management',
      path: '/admin/songs',
      title: t("admin.links.songs"),
      description: t("admin.links.songsDesc"),
      icon: "🎵"
    },
    {
      id: 'artist-management',
      path: '/admin/artists',
      title: t("admin.links.artists"),
      description: t("admin.links.artistsDesc"),
      icon: "🎤"
    }
  ];

  return (
    <div className="admin-page">
      <MetaTags
        title={t("admin.meta.title")}
        description={t("admin.meta.description")}
        url={currentUrl}
        type="website"
      />
      
      
      <div className="admin-container">
        <h1 className="admin-title">{t("admin.title")}</h1>
        <div className="admin-grid">
          {adminLinks.map((link) => (
            <Link 
              key={link.id} 
              className="admin-card"
              to={link.path}
            >
              <div className="admin-card-icon">{link.icon}</div>
              <h2 className="admin-card-title">{link.title}</h2>
              <p className="admin-card-description">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminPage
