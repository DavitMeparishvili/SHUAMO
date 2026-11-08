import type { Locale } from "@/src/modules/localization";
export function profileDesignCopy(locale: Locale) {
  const ka = locale === "ka";
  return {
    edit: ka ? "პროფილის რედაქტირება" : "Edit profile",
    brandTitle: ka ? "ბრენდის პროფილის რედაქტირება" : "Edit brand profile",
    creatorTitle: ka
      ? "შემქმნელის პროფილის რედაქტირება"
      : "Edit creator profile",
    intro: ka
      ? "მართეთ თქვენი ინფორმაცია და პროფილის გამოჩენა Xurjin-ზე."
      : "Manage your information and how it appears on Xurjin.",
    preview: ka ? "გადახედვა" : "Preview",
    previewTitle: ka ? "პროფილის გადახედვა" : "Profile preview",
    previewInfo: ka
      ? "ასე ჩანს თქვენი პროფილი Xurjin-ზე."
      : "This is how your profile appears to others on Xurjin.",
    privatePreview: ka
      ? "პირადი გადახედვა — მონახაზი მხოლოდ თქვენთვისაა ხილული"
      : "Private preview · Only you can see this draft",
    draft: ka ? "პირადი მონახაზი" : "Private draft",
    public: ka ? "საჯარო პროფილი" : "Public profile",
    publicInfo: ka
      ? "ეს ინფორმაცია ჩანს Xurjin-ზე."
      : "This information appears on Xurjin.",
    details: ka ? "დეტალები" : "Brand details",
    about: ka ? "შესახებ" : "About",
    media: ka ? "მედია" : "Media",
    products: ka ? "პროდუქტები" : "Products",
    links: ka ? "ბმულები" : "Links",
    work: ka ? "რჩეული ნამუშევრები" : "Featured work",
    cover: ka ? "გარეკანის ფოტო" : "Cover image",
    photo: ka ? "პროფილის ფოტო" : "Profile photo",
    logo: ka ? "ბრენდის ლოგო" : "Brand logo",
    changeCover: ka ? "გარეკანის შეცვლა" : "Change cover",
    changePhoto: ka ? "ფოტოს შეცვლა" : "Change photo",
    changeLogo: ka ? "ლოგოს შეცვლა" : "Change logo",
    crop: ka ? "მოჭრა" : "Crop",
    reposition: ka ? "პოზიციის შეცვლა" : "Reposition",
    position: ka ? "ფოტოს პოზიცია" : "Image position",
    apply: ka ? "გამოყენება" : "Apply crop",
    removePhoto: ka ? "ფოტოს წაშლა" : "Remove photo",
    logoHint: ka
      ? "რეკომენდებულია: 400 × 400 პქ. PNG ან JPG."
      : "Recommended: 400 × 400 px. PNG or JPG.",
    name: ka ? "ბრენდის სახელი" : "Brand name",
    displayName: ka ? "საჩვენებელი სახელი" : "Display name",
    tagline: ka ? "მოკლე აღწერა" : "Tagline",
    bio: ka ? "მოკლე ბიოგრაფია" : "Short bio",
    description: ka ? "ბრენდის შესახებ" : "About the brand",
    optionalAbout: ka ? "შესახებ (არასავალდებულო)" : "About (optional)",
    location: ka ? "მდებარეობა" : "Location",
    categories: ka ? "კატეგორიები" : "Categories",
    productCategories: ka ? "პროდუქტის კატეგორიები" : "Product categories",
    interests: ka ? "თანამშრომლობის ინტერესები" : "Collaboration interests",
    languages: ka ? "ენები" : "Languages",
    formats: ka ? "კონტენტის ფორმატები" : "Content formats",
    social: ka ? "სოციალური ბმულები" : "Social links",
    socialProfiles: ka ? "სოციალური პროფილები" : "Social profiles",
    socialHint: ka
      ? "მართეთ თქვენი სოციალური პროფილების ბმულები."
      : "Manage your Instagram, TikTok, and YouTube links.",
    workHint: ka
      ? "მართეთ თქვენი რჩეული პროექტები და კონტენტი."
      : "Manage your featured projects and content.",
    readMore: ka ? "მეტის ნახვა" : "Read more",
    showLess: ka ? "ნაკლების ნახვა" : "Show less",
    account: ka ? "ანგარიშის მიმოხილვა" : "Account review",
    accountHint: ka
      ? "ანგარიშის სტატუსი სოციალურ პროფილებს არ ამოწმებს."
      : "Review status is shown separately from your social profiles.",
    translations: ka ? "თარგმანი (არასავალდებულო)" : "Translations (optional)",
    save: ka ? "ცვლილებების შენახვა" : "Save changes",
    saveDraft: ka ? "მონახაზის შენახვა" : "Save draft",
    cancel: ka ? "გაუქმება" : "Cancel",
    unsaved: ka ? "შეუნახავი ცვლილებები" : "Unsaved changes",
    saved: ka ? "ყველა ცვლილება შენახულია" : "All changes saved",
    privateHint: ka
      ? "შენახვა პროფილს პირადად ტოვებს."
      : "Saving keeps this profile private.",
    publicHint: ka
      ? "ცვლილებები განაახლებს თქვენს საჯარო პროფილს."
      : "Changes update your public profile.",
    browse: ka ? "პროდუქტების ნახვა" : "Browse products",
    viewProduct: ka ? "პროდუქტის ნახვა" : "View product",
    viewAll: ka ? "ყველას ნახვა" : "View all",
    featured: ka ? "რჩეული პროდუქტები" : "Featured products",
    selected: ka ? "არჩეული" : "selected",
    reorder: ka ? "გადალაგება" : "Reorder",
    add: ka ? "დამატება" : "Add",
    emptyProducts: ka
      ? "დაამატეთ პროდუქტი კატალოგში, რომ პროფილზე გამოჩნდეს."
      : "Add products to your catalogue to feature them here.",
    discard: ka
      ? "გაუქმდეს შეუნახავი ცვლილებები?"
      : "Discard your unsaved changes?",
  };
}
