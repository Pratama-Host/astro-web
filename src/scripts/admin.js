/* ================================================================
   Admin CMS — entry point.
   Modul fitur berada di ./admin/*.js. Urutan import = urutan pemasangan event listener.
   ================================================================ */
import { registry } from "./admin/core.js";
import { checkSession } from "./admin/shell.js";
import { loadMembers } from "./admin/members.js";
import { loadGallery } from "./admin/gallery.js";
import { loadContent } from "./admin/content.js";
import { loadCollections } from "./admin/collections.js";
import { loadAppearance } from "./admin/appearance.js";
import "./admin/developer-theme.js";
import { loadDeveloperStories } from "./admin/developer-stories.js";
import "./admin/assets.js";
import { loadNavigation } from "./admin/navigation.js";
import { loadPages } from "./admin/seo.js";
import { loadSections } from "./admin/sections.js";
import { loadMedia } from "./admin/media.js";
import "./admin/system.js";

registry.loaders = {
  members: loadMembers,
  gallery: loadGallery,
  content: loadContent,
  collections: loadCollections,
  sections: loadSections,
  appearance: loadAppearance,
  navigation: loadNavigation,
  seo: async () => {
    await loadPages();
    await loadDeveloperStories();
  },
  media: loadMedia,
};

checkSession();
