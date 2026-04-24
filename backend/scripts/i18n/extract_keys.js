const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, 'i18n', 'messages');
const fr = JSON.parse(fs.readFileSync(path.join(messagesDir, 'fr.json'), 'utf8'));

const targets = ['en.json', 'ar.json', 'tz-ltn.json', 'tz-tfng.json'];

// === Translation maps ===
const translationMaps = {};

translationMaps['en.json'] = {
  "common.noDataToUpdate": "No data to update",
  "auth.emailAlreadyUsed": "A user with this email already exists",
  "auth.forbidden": "Access denied",
  "auth.invalidEmail": "Invalid email",
  "auth.invalidPassword": "Incorrect password",
  "auth.passwordDigit": "Password must contain at least one digit",
  "auth.passwordLowercase": "Password must contain at least one lowercase letter",
  "auth.passwordUppercase": "Password must contain at least one uppercase letter",
  "auth.professionalCreated": "Professional account created. Pending administrator validation.",
  "auth.required": "Authentication required",
  "auth.userCreated": "User created successfully",
  "auth.userNotFound": "User not found",
  "auth.wrongPassword": "Incorrect password",
  "email.alreadyVerified": "Email already verified",
  "email.changeConfirmationSent": "Change confirmation emails sent",
  "email.changeSuccess": "Email changed successfully",
  "email.invalidToken": "Invalid or expired token",
  "email.resetAlreadySent": "A reset email has already been sent recently",
  "email.resetLinkSent": "Reset link sent",
  "email.sendError": "Error sending email",
  "email.verificationAlreadySent": "A verification email has already been sent",
  "evenement.notFound": "Event not found",
  "intervenant.hasPrograms": "Cannot deactivate this speaker as they are associated with ${count} program(s)",
  "lieu.communeNotFound": "Municipality not found",
  "lieu.coordsOutOfRange": "Coordinates out of valid range",
  "lieu.detailsNotFound": "Location details not found",
  "lieu.detailsUpdated": "Location details updated",
  "lieu.hasEvents": "This location has associated events",
  "lieu.invalidCoords": "Invalid GPS coordinates",
  "lieu.invalidLocalite": "Invalid locality",
  "lieu.missingFields": "Required fields missing",
  "lieu.serviceAdded": "Service added to location",
  "lieu.serviceDeleted": "Service removed from location",
  "lieu.serviceNotFound": "Location service not found",
  "lieu.serviceUpdated": "Location service updated",
  "lieu.wilayaNotFound": "Wilaya not found",
  "metadata.typeOeuvreCreated": "Work type created",
  "metadata.categorieCreated": "Category created",
  "notification.markedAsRead": "Notification marked as read",
  "notification.allMarkedAsRead": "All notifications marked as read",
  "notification.broadcastSent": "Notification broadcast to all users",
  "notification.preferencesUpdated": "Notification preferences updated",
  "parcours.gpsRequired": "GPS coordinates are required for steps",
  "parcours.stepRemoved": "Step removed",
  "programme.reordered": "Programs order updated",
  "programme.statusUpdated": "Program status updated",
  "articleBlock.created": "Block created successfully",
  "articleBlock.updated": "Block updated successfully",
  "articleBlock.deleted": "Block deleted successfully",
  "articleBlock.duplicated": "Block duplicated successfully",
  "articleBlock.multipleCreated": "${count} blocks created successfully",
  "articleBlock.notFound": "Block not found",
  "articleBlock.notBelongToArticle": "Specified blocks do not belong to this article",
  "articleBlock.reordered": "Blocks order updated",
  "admin.cannotDeleteAdmin": "Cannot delete an administrator",
  "admin.cannotDeleteSelf": "You cannot delete your own account",
  "admin.noUsersFound": "No users found",
  "admin.passwordReset": "Password reset",
  "admin.roleChanged": "Role changed successfully",
  "admin.roleNotFound": "Role not found",
  "admin.userDeleted": "User deleted",
  "admin.userReactivated": "User reactivated",
  "admin.userUpdated": "User updated",
  "upload.noFile": "No file provided",
  "upload.imageSuccess": "Image uploaded successfully",
  "upload.fileSuccess": "File uploaded successfully",
  "upload.profilePhotoUpdated": "Profile photo updated",
  "professionnel.participant.confirmer": "Participation confirmed",
  "professionnel.participant.rejeter": "Participation rejected",
  "professionnel.participant.marquer_present": "Attendance recorded",
  "professionnel.participant.marquer_absent": "Absence recorded"
};

translationMaps['ar.json'] = {
  "common.noDataToUpdate": "لا توجد بيانات للتحديث",
  "auth.emailAlreadyUsed": "يوجد مستخدم بهذا البريد الإلكتروني بالفعل",
  "auth.forbidden": "تم رفض الوصول",
  "auth.invalidEmail": "بريد إلكتروني غير صالح",
  "auth.invalidPassword": "كلمة المرور غير صحيحة",
  "auth.passwordDigit": "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل",
  "auth.passwordLowercase": "يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل",
  "auth.passwordUppercase": "يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل",
  "auth.professionalCreated": "تم إنشاء الحساب المهني. في انتظار التحقق من المسؤول.",
  "auth.required": "المصادقة مطلوبة",
  "auth.userCreated": "تم إنشاء المستخدم بنجاح",
  "auth.userNotFound": "المستخدم غير موجود",
  "auth.wrongPassword": "كلمة المرور غير صحيحة",
  "email.alreadyVerified": "البريد الإلكتروني تم التحقق منه بالفعل",
  "email.changeConfirmationSent": "تم إرسال رسائل تأكيد التغيير",
  "email.changeSuccess": "تم تغيير البريد الإلكتروني بنجاح",
  "email.invalidToken": "رمز غير صالح أو منتهي الصلاحية",
  "email.resetAlreadySent": "تم إرسال بريد إعادة التعيين بالفعل مؤخراً",
  "email.resetLinkSent": "تم إرسال رابط إعادة التعيين",
  "email.sendError": "خطأ في إرسال البريد الإلكتروني",
  "email.verificationAlreadySent": "تم إرسال بريد التحقق بالفعل",
  "evenement.notFound": "الحدث غير موجود",
  "intervenant.hasPrograms": "لا يمكن تعطيل هذا المتحدث لأنه مرتبط بـ ${count} برنامج(برامج)",
  "lieu.communeNotFound": "البلدية غير موجودة",
  "lieu.coordsOutOfRange": "الإحداثيات خارج النطاق الصالح",
  "lieu.detailsNotFound": "تفاصيل المكان غير موجودة",
  "lieu.detailsUpdated": "تم تحديث تفاصيل المكان",
  "lieu.hasEvents": "هذا المكان مرتبط بأحداث",
  "lieu.invalidCoords": "إحداثيات GPS غير صالحة",
  "lieu.invalidLocalite": "المنطقة غير صالحة",
  "lieu.missingFields": "حقول إلزامية مفقودة",
  "lieu.serviceAdded": "تمت إضافة الخدمة إلى المكان",
  "lieu.serviceDeleted": "تم حذف الخدمة من المكان",
  "lieu.serviceNotFound": "خدمة المكان غير موجودة",
  "lieu.serviceUpdated": "تم تحديث خدمة المكان",
  "lieu.wilayaNotFound": "الولاية غير موجودة",
  "metadata.typeOeuvreCreated": "تم إنشاء نوع العمل",
  "metadata.categorieCreated": "تم إنشاء الفئة",
  "notification.markedAsRead": "تم وضع علامة مقروء على الإشعار",
  "notification.allMarkedAsRead": "تم وضع علامة مقروء على جميع الإشعارات",
  "notification.broadcastSent": "تم بث الإشعار لجميع المستخدمين",
  "notification.preferencesUpdated": "تم تحديث تفضيلات الإشعارات",
  "parcours.gpsRequired": "إحداثيات GPS مطلوبة للمراحل",
  "parcours.stepRemoved": "تم حذف المرحلة",
  "programme.reordered": "تم تحديث ترتيب البرامج",
  "programme.statusUpdated": "تم تحديث حالة البرنامج",
  "articleBlock.created": "تم إنشاء الكتلة بنجاح",
  "articleBlock.updated": "تم تحديث الكتلة بنجاح",
  "articleBlock.deleted": "تم حذف الكتلة بنجاح",
  "articleBlock.duplicated": "تم تكرار الكتلة بنجاح",
  "articleBlock.multipleCreated": "تم إنشاء ${count} كتل بنجاح",
  "articleBlock.notFound": "الكتلة غير موجودة",
  "articleBlock.notBelongToArticle": "الكتل المحددة لا تنتمي لهذا المقال",
  "articleBlock.reordered": "تم تحديث ترتيب الكتل",
  "admin.cannotDeleteAdmin": "لا يمكن حذف مسؤول",
  "admin.cannotDeleteSelf": "لا يمكنك حذف حسابك الخاص",
  "admin.noUsersFound": "لم يتم العثور على مستخدمين",
  "admin.passwordReset": "تمت إعادة تعيين كلمة المرور",
  "admin.roleChanged": "تم تغيير الدور بنجاح",
  "admin.roleNotFound": "الدور غير موجود",
  "admin.userDeleted": "تم حذف المستخدم",
  "admin.userReactivated": "تم إعادة تنشيط المستخدم",
  "admin.userUpdated": "تم تحديث المستخدم",
  "upload.noFile": "لم يتم تقديم أي ملف",
  "upload.imageSuccess": "تم رفع الصورة بنجاح",
  "upload.fileSuccess": "تم رفع الملف بنجاح",
  "upload.profilePhotoUpdated": "تم تحديث صورة الملف الشخصي"
};

translationMaps['tz-ltn.json'] = {
  "common.noDataToUpdate": "Ulac isefka i uleqqem",
  "auth.emailAlreadyUsed": "Aseqdac s yimayl-a yella yakan",
  "auth.forbidden": "Anekcum yettwagi",
  "auth.invalidEmail": "Imayl ur yeṣliḥ ara",
  "auth.invalidPassword": "Awal uffir ur yeṣliḥ ara",
  "auth.passwordDigit": "Awal uffir yessefk ad yesɛu yiwen n wuṭṭun ma drus",
  "auth.passwordLowercase": "Awal uffir yessefk ad yesɛu yiwet n tsekkilt tameẓyant ma drus",
  "auth.passwordUppercase": "Awal uffir yessefk ad yesɛu yiwet n tsekkilt tameqqrant ma drus",
  "auth.professionalCreated": "Amiḍan amhennay yettwarna. Ittraǧu asegged n unedbal.",
  "auth.required": "Asesteb yettusra",
  "auth.userCreated": "Aseqdac yettwarna akken iwata",
  "auth.userNotFound": "Aseqdac ur yettuwaf ara",
  "auth.wrongPassword": "Awal uffir ur yeṣliḥ ara",
  "email.alreadyVerified": "Imayl yettwasenqed yakan",
  "email.changeConfirmationSent": "Imaylen n usentem n ubeddel ttwazenan",
  "email.changeSuccess": "Imayl yettubeddel akken iwata",
  "email.invalidToken": "Ajuṭṭu ur yeṣliḥ ara neɣ yemmut",
  "email.resetAlreadySent": "Imayl n uwennez yettwazen yakan melmi kan",
  "email.resetLinkSent": "Aseɣwen n uwennez yettwazen",
  "email.sendError": "Tuccḍa deg uzen n yimayl",
  "email.verificationAlreadySent": "Imayl n usenqed yettwazen yakan",
  "evenement.notFound": "Taneḍḍurt ur tettuwaf ara",
  "intervenant.hasPrograms": "Ur yezmir ara ad yenṭeḍ unemhal-a imi yettwarnan ɣer ${count} n yihilen",
  "lieu.communeNotFound": "Taɣiwant ur tettuwaf ara",
  "lieu.coordsOutOfRange": "Isulayen berra n tegrumma taṣliḥt",
  "lieu.detailsNotFound": "Talqayin n udeg ur ttwafent ara",
  "lieu.detailsUpdated": "Talqayin n udeg ttwaleqment",
  "lieu.hasEvents": "Adeg-a ɣur-s tineḍḍurin",
  "lieu.invalidCoords": "Isulayen GPS ur ṣliḥen ara",
  "lieu.invalidLocalite": "Taɣiwant ur teṣliḥ ara",
  "lieu.missingFields": "Urtan ilugan xussen",
  "lieu.serviceAdded": "Ameẓlu yettwarnan ɣer udeg",
  "lieu.serviceDeleted": "Ameẓlu yettwakkes seg udeg",
  "lieu.serviceNotFound": "Ameẓlu n udeg ur yettuwaf ara",
  "lieu.serviceUpdated": "Ameẓlu n udeg yettwalqem",
  "lieu.wilayaNotFound": "Tawilayt ur tettuwaf ara",
  "metadata.typeOeuvreCreated": "Anaw n umahil yettwarna",
  "metadata.categorieCreated": "Taggayt tettwasnulfu",
  "notification.markedAsRead": "Alɣu yettwarecm d yettwaɣra",
  "notification.allMarkedAsRead": "Meṛṛa ilɣuten ttwacerḍen d yettwaɣran",
  "notification.broadcastSent": "Alɣu yettwazen i meṛṛa iseqdacen",
  "notification.preferencesUpdated": "Ismenyifen n yilɣuten ttwaleqmen",
  "parcours.gpsRequired": "Isulayen GPS ttusran i yiḥricen",
  "parcours.stepRemoved": "Aḥric yettwakkes",
  "programme.reordered": "Amizzwer n yihilen yettwalqem",
  "programme.statusUpdated": "Addad n uhil yettwalqem",
  "articleBlock.created": "Iḥric yettwarna akken iwata",
  "articleBlock.updated": "Iḥric yettwalqem akken iwata",
  "articleBlock.deleted": "Iḥric yettwakkes akken iwata",
  "articleBlock.duplicated": "Iḥric yettwasnen akken iwata",
  "articleBlock.multipleCreated": "${count} n yiḥricen ttwarnant akken iwata",
  "articleBlock.notFound": "Iḥric ur yettuwaf ara",
  "articleBlock.notBelongToArticle": "Iḥricen ibanen ur ttekkin ara ɣer umagrad-a",
  "articleBlock.reordered": "Amizzwer n yiḥricen yettwalqem",
  "admin.cannotDeleteAdmin": "Ur yezmir ara ad yettwakkes unedbal",
  "admin.cannotDeleteSelf": "Ur tezmireḍ ara ad tekkseḍ amiḍan-inek",
  "admin.noUsersFound": "Ulac iseqdacen yettwafan",
  "admin.passwordReset": "Awal uffir yettuwennez",
  "admin.roleChanged": "Aṭṭas yettubeddel akken iwata",
  "admin.roleNotFound": "Aṭṭas ur yettuwaf ara",
  "admin.userDeleted": "Aseqdac yettwakkes",
  "admin.userReactivated": "Aseqdac yettwarmed",
  "admin.userUpdated": "Aseqdac yettwalqem",
  "upload.noFile": "Ulac afaylu yettunefken",
  "upload.imageSuccess": "Tawlaft tettwazen akken iwata",
  "upload.fileSuccess": "Afaylu yettwazen akken iwata",
  "upload.profilePhotoUpdated": "Tawlaft n umaɣnu tettwalqem"
};

translationMaps['tz-tfng.json'] = {
  "common.noDataToUpdate": "ⵓⵍⴰⵛ ⵉⵙⴼⴽⴰ ⵉ ⵓⵍⵇⵇⵎ",
  "auth.emailAlreadyUsed": "ⴰⵙⵇⴷⴰⵛ ⵙ ⵢⵉⵎⴰⵢⵍ-ⴰ ⵢⵍⵍⴰ ⵢⴰⴽⴰⵏ",
  "auth.forbidden": "ⴰⵏⴽⵛⵓⵎ ⵢⵜⵜⵡⴰⴳⵉ",
  "auth.invalidEmail": "ⵉⵎⴰⵢⵍ ⵓⵔ ⵢⵚⵍⵉⵃ ⴰⵔⴰ",
  "auth.invalidPassword": "ⴰⵡⴰⵍ ⵓⴼⴼⵉⵔ ⵓⵔ ⵢⵚⵍⵉⵃ ⴰⵔⴰ",
  "auth.passwordDigit": "ⴰⵡⴰⵍ ⵓⴼⴼⵉⵔ ⵢⵙⵙⴼⴽ ⴰⴷ ⵢⵙⵄⵓ ⵢⵉⵡⵏ ⵏ ⵡⵓⵟⵟⵓⵏ ⵎⴰ ⴷⵔⵓⵙ",
  "auth.passwordLowercase": "ⴰⵡⴰⵍ ⵓⴼⴼⵉⵔ ⵢⵙⵙⴼⴽ ⴰⴷ ⵢⵙⵄⵓ ⵢⵉⵡⵜ ⵏ ⵜⵙⴽⴽⵉⵍⵜ ⵜⴰⵎⵥⵢⴰⵏⵜ ⵎⴰ ⴷⵔⵓⵙ",
  "auth.passwordUppercase": "ⴰⵡⴰⵍ ⵓⴼⴼⵉⵔ ⵢⵙⵙⴼⴽ ⴰⴷ ⵢⵙⵄⵓ ⵢⵉⵡⵜ ⵏ ⵜⵙⴽⴽⵉⵍⵜ ⵜⴰⵎⵇⵇⵔⴰⵏⵜ ⵎⴰ ⴷⵔⵓⵙ",
  "auth.professionalCreated": "ⴰⵎⵉⴹⴰⵏ ⴰⵎⵀⵏⵏⴰⵢ ⵢⵜⵜⵡⴰⵔⵏⴰ. ⵉⵜⵜⵔⴰⵊⵓ ⴰⵙⴳⴳⴷ ⵏ ⵓⵏⴷⴱⴰⵍ.",
  "auth.required": "ⴰⵙⵙⵜⴱ ⵢⵜⵜⵓⵙⵔⴰ",
  "auth.userCreated": "ⴰⵙⵇⴷⴰⵛ ⵢⵜⵜⵡⴰⵔⵏⴰ ⴰⴽⴽⵏ ⵉⵡⴰⵜⴰ",
  "auth.userNotFound": "ⴰⵙⵇⴷⴰⵛ ⵓⵔ ⵢⵜⵜⵓⵡⴰⴼ ⴰⵔⴰ",
  "auth.wrongPassword": "ⴰⵡⴰⵍ ⵓⴼⴼⵉⵔ ⵓⵔ ⵢⵚⵍⵉⵃ ⴰⵔⴰ",
  "email.alreadyVerified": "ⵉⵎⴰⵢⵍ ⵢⵜⵜⵡⴰⵙⵏⵇⴷ ⵢⴰⴽⴰⵏ",
  "email.changeConfirmationSent": "ⵉⵎⴰⵢⵍⵏ ⵏ ⵓⵙⵏⵜⵎ ⵏ ⵓⴱⴷⴷⵍ ⵜⵜⵡⴰⵣⵏⴰⵏ",
  "email.changeSuccess": "ⵉⵎⴰⵢⵍ ⵢⵜⵜⵓⴱⴷⴷⵍ ⴰⴽⴽⵏ ⵉⵡⴰⵜⴰ",
  "email.invalidToken": "ⴰⵊⵓⵟⵟⵓ ⵓⵔ ⵢⵚⵍⵉⵃ ⴰⵔⴰ ⵏⵖ ⵢⵎⵎⵓⵜ",
  "email.resetAlreadySent": "ⵉⵎⴰⵢⵍ ⵏ ⵓⵡⵏⵏⵣ ⵢⵜⵜⵡⴰⵣⵏ ⵢⴰⴽⴰⵏ ⵎⵍⵎⵉ ⴽⴰⵏ",
  "email.resetLinkSent": "ⴰⵙⵖⵡⵏ ⵏ ⵓⵡⵏⵏⵣ ⵢⵜⵜⵡⴰⵣⵏ",
  "email.sendError": "ⵜⵓⵛⴹⴰ ⴷⴳ ⵓⵣⵏ ⵏ ⵢⵉⵎⴰⵢⵍ",
  "email.verificationAlreadySent": "ⵉⵎⴰⵢⵍ ⵏ ⵓⵙⵏⵇⴷ ⵢⵜⵜⵡⴰⵣⵏ ⵢⴰⴽⴰⵏ",
  "evenement.notFound": "ⵜⴰⵏⴹⴹⵓⵔⵜ ⵓⵔ ⵜⵜⵓⵡⴰⴼ ⴰⵔⴰ",
  "intervenant.hasPrograms": "ⵓⵔ ⵢⵣⵎⵉⵔ ⴰⵔⴰ ⴰⴷ ⵢⵏⵟⴹ ⵓⵏⵎⵀⴰⵍ-ⴰ ⵉⵎⵉ ⵢⵜⵜⵡⴰⵔⵏⴰⵏ ⵖⵔ ${count} ⵏ ⵢⵉⵀⵉⵍⵏ",
  "lieu.communeNotFound": "ⵜⴰⵖⵉⵡⴰⵏⵜ ⵓⵔ ⵜⵜⵓⵡⴰⴼ ⴰⵔⴰ",
  "lieu.coordsOutOfRange": "ⵉⵙⵓⵍⴰⵢⵏ ⴱⵔⵔⴰ ⵏ ⵜⴳⵔⵓⵎⵎⴰ ⵜⴰⵚⵍⵉⵃⵜ",
  "lieu.detailsNotFound": "ⵜⴰⵍⵇⴰⵢⵉⵏ ⵏ ⵓⴷⴳ ⵓⵔ ⵜⵜⵡⴰⴼⵏⵜ ⴰⵔⴰ",
  "lieu.detailsUpdated": "ⵜⴰⵍⵇⴰⵢⵉⵏ ⵏ ⵓⴷⴳ ⵜⵜⵡⴰⵍⵇⵎⵏⵜ",
  "lieu.hasEvents": "ⴰⴷⴳ-ⴰ ⵖⵓⵔ-ⵙ ⵜⵉⵏⴹⴹⵓⵔⵉⵏ",
  "lieu.invalidCoords": "ⵉⵙⵓⵍⴰⵢⵏ GPS ⵓⵔ ⵚⵍⵉⵃⵏ ⴰⵔⴰ",
  "lieu.invalidLocalite": "ⵜⴰⵖⵉⵡⴰⵏⵜ ⵓⵔ ⵜⵚⵍⵉⵃ ⴰⵔⴰ",
  "lieu.missingFields": "ⵓⵔⵜⴰⵏ ⵉⵍⵓⴳⴰⵏ ⵅⵓⵙⵙⵏ",
  "lieu.serviceAdded": "ⴰⵎⵥⵍⵓ ⵢⵜⵜⵡⴰⵔⵏⴰⵏ ⵖⵔ ⵓⴷⴳ",
  "lieu.serviceDeleted": "ⴰⵎⵥⵍⵓ ⵢⵜⵜⵡⴰⴽⴽⵙ ⵙⴳ ⵓⴷⴳ",
  "lieu.serviceNotFound": "ⴰⵎⵥⵍⵓ ⵏ ⵓⴷⴳ ⵓⵔ ⵢⵜⵜⵓⵡⴰⴼ ⴰⵔⴰ",
  "lieu.serviceUpdated": "ⴰⵎⵥⵍⵓ ⵏ ⵓⴷⴳ ⵢⵜⵜⵡⴰⵍⵇⵎ",
  "lieu.wilayaNotFound": "ⵜⴰⵡⵉⵍⴰⵢⵜ ⵓⵔ ⵜⵜⵓⵡⴰⴼ ⴰⵔⴰ",
  "metadata.typeOeuvreCreated": "ⴰⵏⴰⵡ ⵏ ⵓⵎⴰⵀⵉⵍ ⵢⵜⵜⵡⴰⵔⵏⴰ",
  "metadata.categorieCreated": "ⵜⴰⴳⴳⴰⵢⵜ ⵜⵜⵡⴰⵙⵏⵓⵍⴼⵓ",
  "notification.markedAsRead": "ⴰⵍⵖⵓ ⵢⵜⵜⵡⴰⵔⵛⵎ ⴷ ⵢⵜⵜⵡⴰⵖⵔⴰ",
  "notification.allMarkedAsRead": "ⵎⵕⵕⴰ ⵉⵍⵖⵓⵜⵏ ⵜⵜⵡⴰⵛⵔⴹⵏ ⴷ ⵢⵜⵜⵡⴰⵖⵔⴰⵏ",
  "notification.broadcastSent": "ⴰⵍⵖⵓ ⵢⵜⵜⵡⴰⵣⵏ ⵉ ⵎⵕⵕⴰ ⵉⵙⵇⴷⴰⵛⵏ",
  "notification.preferencesUpdated": "ⵉⵙⵎⵏⵢⵉⴼⵏ ⵏ ⵢⵉⵍⵖⵓⵜⵏ ⵜⵜⵡⴰⵍⵇⵎⵏ",
  "parcours.gpsRequired": "ⵉⵙⵓⵍⴰⵢⵏ GPS ⵜⵜⵓⵙⵔⴰⵏ ⵉ ⵢⵉⵃⵔⵉⵛⵏ",
  "parcours.stepRemoved": "ⴰⵃⵔⵉⵛ ⵢⵜⵜⵡⴰⴽⴽⵙ",
  "programme.reordered": "ⴰⵎⵉⵣⵣⵡⵔ ⵏ ⵢⵉⵀⵉⵍⵏ ⵢⵜⵜⵡⴰⵍⵇⵎ",
  "programme.statusUpdated": "ⴰⴷⴷⴰⴷ ⵏ ⵓⵀⵉⵍ ⵢⵜⵜⵡⴰⵍⵇⵎ",
  "articleBlock.created": "ⵉⵃⵔⵉⵛ ⵢⵜⵜⵡⴰⵔⵏⴰ ⴰⴽⴽⵏ ⵉⵡⴰⵜⴰ",
  "articleBlock.updated": "ⵉⵃⵔⵉⵛ ⵢⵜⵜⵡⴰⵍⵇⵎ ⴰⴽⴽⵏ ⵉⵡⴰⵜⴰ",
  "articleBlock.deleted": "ⵉⵃⵔⵉⵛ ⵢⵜⵜⵡⴰⴽⴽⵙ ⴰⴽⴽⵏ ⵉⵡⴰⵜⴰ",
  "articleBlock.duplicated": "ⵉⵃⵔⵉⵛ ⵢⵜⵜⵡⴰⵙⵏⵏ ⴰⴽⴽⵏ ⵉⵡⴰⵜⴰ",
  "articleBlock.multipleCreated": "${count} ⵏ ⵢⵉⵃⵔⵉⵛⵏ ⵜⵜⵡⴰⵔⵏⴰⵏⵜ ⴰⴽⴽⵏ ⵉⵡⴰⵜⴰ",
  "articleBlock.notFound": "ⵉⵃⵔⵉⵛ ⵓⵔ ⵢⵜⵜⵓⵡⴰⴼ ⴰⵔⴰ",
  "articleBlock.notBelongToArticle": "ⵉⵃⵔⵉⵛⵏ ⵉⴱⴰⵏⵏ ⵓⵔ ⵜⵜⴽⴽⵉⵏ ⴰⵔⴰ ⵖⵔ ⵓⵎⴰⴳⵔⴰⴷ-ⴰ",
  "articleBlock.reordered": "ⴰⵎⵉⵣⵣⵡⵔ ⵏ ⵢⵉⵃⵔⵉⵛⵏ ⵢⵜⵜⵡⴰⵍⵇⵎ",
  "admin.cannotDeleteAdmin": "ⵓⵔ ⵢⵣⵎⵉⵔ ⴰⵔⴰ ⴰⴷ ⵢⵜⵜⵡⴰⴽⴽⵙ ⵓⵏⴷⴱⴰⵍ",
  "admin.cannotDeleteSelf": "ⵓⵔ ⵜⵣⵎⵉⵔⴹ ⴰⵔⴰ ⴰⴷ ⵜⴽⴽⵙⴹ ⴰⵎⵉⴹⴰⵏ-ⵉⵏⴽ",
  "admin.noUsersFound": "ⵓⵍⴰⵛ ⵉⵙⵇⴷⴰⵛⵏ ⵢⵜⵜⵓⵡⴰⴼⵏ",
  "admin.passwordReset": "ⴰⵡⴰⵍ ⵓⴼⴼⵉⵔ ⵢⵜⵜⵓⵡⵏⵏⵣ",
  "admin.roleChanged": "ⴰⵟⵟⴰⵙ ⵢⵜⵜⵓⴱⴷⴷⵍ ⴰⴽⴽⵏ ⵉⵡⴰⵜⴰ",
  "admin.roleNotFound": "ⴰⵟⵟⴰⵙ ⵓⵔ ⵢⵜⵜⵓⵡⴰⴼ ⴰⵔⴰ",
  "admin.userDeleted": "ⴰⵙⵇⴷⴰⵛ ⵢⵜⵜⵡⴰⴽⴽⵙ",
  "admin.userReactivated": "ⴰⵙⵇⴷⴰⵛ ⵢⵜⵜⵡⴰⵔⵎⴷ",
  "admin.userUpdated": "ⴰⵙⵇⴷⴰⵛ ⵢⵜⵜⵡⴰⵍⵇⵎ",
  "upload.noFile": "ⵓⵍⴰⵛ ⴰⴼⴰⵢⵍⵓ ⵢⵜⵜⵓⵏⴼⴽⵏ",
  "upload.imageSuccess": "ⵜⴰⵡⵍⴰⴼⵜ ⵜⵜⵡⴰⵣⵏ ⴰⴽⴽⵏ ⵉⵡⴰⵜⴰ",
  "upload.fileSuccess": "ⴰⴼⴰⵢⵍⵓ ⵢⵜⵜⵡⴰⵣⵏ ⴰⴽⴽⵏ ⵉⵡⴰⵜⴰ",
  "upload.profilePhotoUpdated": "ⵜⴰⵡⵍⴰⴼⵜ ⵏ ⵓⵎⴰⵖⵏⵓ ⵜⵜⵡⴰⵍⵇⵎ"
};

// === Main sync loop ===
for (const file of targets) {
  const filePath = path.join(messagesDir, file);
  const lang = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let added = 0;

  for (const [ns, frObj] of Object.entries(fr)) {
    if (!lang[ns]) {
      lang[ns] = {};
    }
    for (const [key, val] of Object.entries(frObj)) {
      if (typeof val === 'object' && val !== null) {
        if (!lang[ns][key]) lang[ns][key] = {};
        for (const [subKey, subVal] of Object.entries(val)) {
          if (lang[ns][key][subKey] === undefined) {
            lang[ns][key][subKey] = subVal;
            added++;
          }
        }
      } else if (lang[ns][key] === undefined) {
        const map = translationMaps[file] || {};
        lang[ns][key] = map[`${ns}.${key}`] || val;
        added++;
      }
    }
  }

  // Reorder to match fr.json key order
  const ordered = {};
  for (const ns of Object.keys(fr)) {
    ordered[ns] = {};
    for (const key of Object.keys(fr[ns])) {
      if (typeof fr[ns][key] === 'object' && fr[ns][key] !== null) {
        ordered[ns][key] = {};
        for (const subKey of Object.keys(fr[ns][key])) {
          ordered[ns][key][subKey] = lang[ns]?.[key]?.[subKey] ?? fr[ns][key][subKey];
        }
      } else {
        ordered[ns][key] = lang[ns]?.[key] ?? fr[ns][key];
      }
    }
    if (lang[ns]) {
      for (const key of Object.keys(lang[ns])) {
        if (ordered[ns][key] === undefined) {
          ordered[ns][key] = lang[ns][key];
        }
      }
    }
  }
  for (const ns of Object.keys(lang)) {
    if (!ordered[ns]) ordered[ns] = lang[ns];
  }

  fs.writeFileSync(filePath, JSON.stringify(ordered, null, 2) + '\n', 'utf8');
  console.log(`${file}: ${added} keys added/synced`);
}

console.log('\nDone!');
