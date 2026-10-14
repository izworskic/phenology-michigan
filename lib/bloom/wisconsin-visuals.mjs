// Every photo is a credited historic/file image; none represents live Wisconsin bloom.
export const WISCONSIN_PHOTOS = Object.freeze({
  'uw-arboretum': Object.freeze({
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Lilacs_at_UW_Arboretum_Longenecker_Horticultural_Garden.jpg/1280px-Lilacs_at_UW_Arboretum_Longenecker_Horticultural_Garden.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lilacs_at_UW_Arboretum_Longenecker_Horticultural_Garden.jpg',
    creator: 'KLongC',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    location: 'UW–Madison Arboretum · Longenecker lilac rooms',
    date: 'May 2022',
    alt: 'Lilac garden rooms at the University of Wisconsin–Madison Arboretum in May 2022',
  }),
  'fragrant-isle-lavender': Object.freeze({
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Lavender_field_on_Washington_Island_Wisconsin.jpg/500px-Lavender_field_on_Washington_Island_Wisconsin.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lavender_field_on_Washington_Island_Wisconsin.jpg',
    creator: 'Leif Kurth; cropped by Epiphyllumlover',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    location: 'Washington Island · lavender field',
    date: 'July 2017',
    alt: 'Lavender rows photographed on Washington Island Wisconsin in July 2017',
  }),
  'olbrich-gardens': Object.freeze({
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Olbrich_Botanical_Gardens_-_panoramio_%287%29.jpg?width=960',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Olbrich_Botanical_Gardens_-_panoramio_(7).jpg',
    creator: 'Corey Coyle',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    location: 'Olbrich Botanical Gardens · Madison',
    date: 'April 2015',
    alt: 'Olbrich Botanical Gardens in Madison Wisconsin photographed in April 2015',
  }),
});
export function wisconsinPhotoFor(id){return WISCONSIN_PHOTOS[id]||null;}
