
// Centralized icon imports to reduce bundle size
export {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome
} from '@expo/vector-icons';

// Specific icon imports to enable tree shaking
export const Icons = {
  // MaterialCommunityIcons
  home: 'home',
  clockOutline: 'clock-outline',
  accountGroup: 'account-group',
  wrench: 'wrench',
  fileDocument: 'file-document',
  cog: 'cog',
  logout: 'logout',
  
  // Common icons
  menu: 'menu',
  close: 'close',
  check: 'check',
  edit: 'edit',
  delete: 'delete',
  add: 'add',
  search: 'search',
  filter: 'filter',
  download: 'download',
  upload: 'upload',
};
