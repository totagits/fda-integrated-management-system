// Official Forestry Development Authority (FDA) photos from https://www.fda.gov.lr/
import carbonPolicyImg from './fda/carbon-policy.jpg';
import timberTradeImg from './fda/timber-trade-cooperation.jpg';
import woodProcessingImg from './fda/wood-processing-mou.jpg';
import eastNimbaImg from './fda/east-nimba-reserve.jpg';
import csaTrainingImg from './fda/csa-capacity-training.jpg';
import greboKrahnImg from './fda/grebo-krahn-wildlife.jpg';
import mdMerabImg from './fda/managing-director-merab.jpg';

export interface FDAPhotoSlide {
  id: string;
  image: string;
  title: string;
  category: string;
  badge: string;
  caption: string;
  sourceUrl: string;
}

export const FDA_CAROUSEL_SLIDES: FDAPhotoSlide[] = [
  {
    id: 'slide-1',
    image: carbonPolicyImg,
    category: 'National Policy',
    badge: 'Executive Briefing',
    title: 'National Carbon Market Policy Presented to President Boakai',
    caption: 'FDA leadership presents the National Carbon Market Framework to His Excellency President Joseph Nyuma Boakai, advancing Liberia’s global climate leadership, forest preservation, and green economy revenues.',
    sourceUrl: 'https://www.fda.gov.lr/media/press-releases/national-carbon-market-policy-presented-president-boakai-advancing-liberias'
  },
  {
    id: 'slide-2',
    image: timberTradeImg,
    category: 'International Forestry',
    badge: 'Bilateral Agreement',
    title: 'Liberia & Ghana Deepen Cooperation to Combat Illegal Timber Trade',
    caption: 'FDA MD Rudolph Merab and Forestry Commission Ghana counterparts sign bilateral operational protocol to enhance cross-border timber legality, e-permitting, and SGS LiberTrace chain of custody harmonization.',
    sourceUrl: 'https://www.fda.gov.lr/media/press-releases/liberia-and-ghana-deepen-cooperation-combat-illegal-timber-trade-fda-and'
  },
  {
    id: 'slide-3',
    image: woodProcessingImg,
    category: 'Value Addition',
    badge: 'Tripartite MOU',
    title: 'FDA, MYS & MVTC Sign MOU for Shared Wood Processing Facility',
    caption: 'Strategic partnership fostering domestic value addition in forestry by training Liberian youth, expanding local timber manufacturing, and reducing raw log export dependency through modern vocational facilities.',
    sourceUrl: 'https://www.fda.gov.lr/media/press-releases/fda-mys-and-mvtc-sign-mou-shared-wood-processing-facility'
  },
  {
    id: 'slide-4',
    image: eastNimbaImg,
    category: 'Protected Areas',
    badge: 'Biodiversity & Conservation',
    title: 'FDA & ArcelorMittal Sign Co-Management MOU for East Nimba',
    caption: 'Landmark public-private conservation agreement safeguarding the East Nimba Nature Reserve (ENNR), protecting unique high-canopy flora, and sustaining ecological corridors in northern Liberia.',
    sourceUrl: 'https://www.fda.gov.lr/media/press-releases/fda-and-arcelormittal-liberia-sign-mou-co-management-east-nimba-nature-reserve'
  },
  {
    id: 'slide-5',
    image: greboKrahnImg,
    category: 'Wildlife Surveillance',
    badge: 'Bio-Monitoring',
    title: 'Wildlife Bio-Monitoring in Grebo-Krahn National Park',
    caption: 'FDA conservation rangers deploy high-tech camera traps and GPS bio-tracking to safeguard endangered chimpanzees, pygmy hippos, and forest elephants across Liberia’s vast protected rainforest.',
    sourceUrl: 'https://www.fda.gov.lr/multimedia/videos/wildlife-grebo-krahn-national-park-liberia-captured-camera-traps'
  },
  {
    id: 'slide-6',
    image: csaTrainingImg,
    category: 'Institutional Reform',
    badge: 'Civil Service Capacity',
    title: 'CSA Conducts Performance Planning Workshop for FDA Cadre',
    caption: 'Civil Service Agency (CSA) and FDA Human Resources team conduct multi-day operational training on performance metrics, dual-currency payroll alignment, and public service compliance.',
    sourceUrl: 'https://www.fda.gov.lr/media/news/csa-conducts-two-day-performance-planning-workshop-fda-human-resource-staff'
  },
  {
    id: 'slide-7',
    image: mdMerabImg,
    category: 'Executive Leadership',
    badge: 'Managing Director',
    title: 'Hon. Rudolph J. Merab, Sr. — Managing Director, FDA',
    caption: 'Steering the Forestry Development Authority into modern digital governance, institutional transparency, community forest benefit sharing, and sustainable revenue mobilization under the ARREST Agenda.',
    sourceUrl: 'https://www.fda.gov.lr/senior-management/managing-director-0'
  }
];
