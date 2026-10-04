import type { Locale } from "@/src/modules/localization";

export function profileSetupCopy(locale: Locale, role: "brand" | "creator") {
  const ka = locale === "ka";
  return {
    oneRemaining: ka
      ? "დარჩენილია 1 პუნქტი. აირჩიეთ შესავსებად."
      : "1 item left. Choose it to complete your profile.",
    wait: ka
      ? "დაელოდეთ შენახვის ან ატვირთვის დასრულებას."
      : "Wait for saving or uploading to finish before leaving.",
    title: ka
      ? "დაასრულეთ პროფილი და გამოაქვეყნეთ"
      : "Finish your profile and publish",
    privacy: ka
      ? `თქვენი ანგარიში აქტიურია, მაგრამ პროფილი პირადია. გამოქვეყნებამდე სხვა მომხმარებლები ვერ ნახავენ მას და ის ${role === "brand" ? "ბრენდების" : "კრეატორების"} სიაში არ გამოჩნდება.`
      : `Your account is active, but your profile is private. Until you publish, other users cannot view it and you will not appear in the ${role === "brand" ? "Brands" : "Creators"} directory.`,
    checklist: ka ? "გამოსაქვეყნებლად აუცილებელია" : "Required to publish",
    ready: ka
      ? "პროფილი მზადაა გამოსაქვეყნებლად."
      : "Your profile is ready to publish.",
    remaining: ka
      ? "დარჩენილია {count} პუნქტი. აირჩიეთ შესავსებად."
      : "{count} items left. Choose one to complete it.",
    saveHint: ka
      ? "მონახაზის შენახვა პროფილს არ აქვეყნებს. ინფორმაცია შეგიძლიათ ერთ ენაზე შეავსოთ."
      : "Saving a draft does not publish it. You only need to fill in one language.",
    savePublish: ka ? "შენახვა და გამოქვეყნება" : "Save and publish",
    saveChanges: ka
      ? "შენახვა და ცვლილებების გამოქვეყნება"
      : "Save and publish changes",
    later: ka ? "ჯერჯერობით პირადად გაგრძელება" : "Continue privately for now",
    leave: ka ? "პროფილი ჯერ პირადია" : "Your profile is still private",
    leaveBody: ka
      ? "გამოქვეყნებამდე პროფილს სხვა მომხმარებლები ვერ ნახავენ და სიაშიც არ გამოჩნდებით. შემდეგ შესვლაზე ისევ პროფილის დასრულებას შემოგთავაზებთ."
      : "Other users cannot view your profile or find you in the directory until you publish. We’ll bring you back to finish it next time you sign in.",
    leaveDirty: ka
      ? "ამ გვერდიდან გასვლით შეუნახავი ცვლილებები დაიკარგება."
      : "Leaving this page will discard your unsaved changes.",
    stay: ka ? "პროფილის დასრულება" : "Finish profile",
    privateTitle: ka ? "თქვენი პროფილი პირადია" : "Your profile is private",
    visibility: ka ? "პროფილის ხილვადობა" : "Profile visibility",
    visibilityHint: ka
      ? "მართეთ, შეუძლიათ თუ არა სხვებს თქვენი პროფილის ნახვა."
      : "Control whether other people can see your profile.",
    published: ka ? "თქვენი პროფილი გამოქვეყნებულია" : "Your profile is public",
    publishedBody: ka
      ? "ახლა სხვებს შეუძლიათ თქვენი პროფილის ნახვა და სიაში პოვნა."
      : "Other people can now view your profile and find you in the directory.",
    view: ka ? "საჯარო პროფილის ნახვა" : "View public profile",
    workspace: ka ? "სამუშაო სივრცეში გაგრძელება" : "Continue to workspace",
    addressHint: ka
      ? "გამოიყენეთ ლათინური პატარა ასოები, ციფრები და დეფისები. მაგალითად: tender-market"
      : "Use lowercase Latin letters, numbers and hyphens. For example: tender-market",
    evidence: ka ? "რას სთავაზობთ მომხმარებლებს?" : "What do you offer?",
    evidenceHint: ka
      ? "მოკლედ აღწერეთ თქვენი პროდუქტი ან მომსახურება."
      : "Briefly describe your products or services.",
    requirements: {
      slug: ka ? "პროფილის საჯარო მისამართი" : "Public profile address",
      tagline: ka ? "მოკლე აღწერა" : "Short introduction",
      description: ka ? "თქვენს შესახებ" : "About you",
      categories: ka ? "მინიმუმ ერთი კატეგორია" : "At least one category",
      heroImageUrl: ka
        ? role === "brand"
          ? "გარეკანის ფოტო"
          : "პროფილის ფოტო"
        : role === "brand"
          ? "Cover image"
          : "Profile photo",
      brandEvidence: ka ? "პროდუქტის ან მომსახურების აღწერა" : "What you offer",
      creatorEvidence: ka
        ? "სოციალური ბმული ან ნამუშევარი"
        : "A social link or featured work",
    } as Record<string, string>,
  };
}
