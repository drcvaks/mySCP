-- Import public quick review question bank for Weeks 13-16.
-- Generated from: C:\Users\Family\ws\mySCPcodex\mySCP_Weeks13_16_Quick_Review_Questions_Mixed_Answers.csv
-- Rows: 80
--
-- Run this in the Supabase SQL editor after the core schema/migrations are applied.
-- Behavior:
-- - replaces existing public-library review questions for Weeks 13-16 only
-- - leaves users, chaburos, memberships, drafts, published chaburah questions, and other weeks untouched
-- - inserts public-library questions as published/enabled so Rabbonim can copy them into Draft Questions
-- - inserts matching protected answer keys in public.review_question_answers
-- - uses the first public.profiles row with role = 'global_admin' as created_by

begin;

create temp table import_public_review_question_bank (
  id uuid primary key,
  week smallint not null,
  topic text not null,
  prompt text not null,
  kind public.review_question_kind not null,
  choices jsonb not null,
  correct_choice_index smallint not null,
  explanation text not null,
  is_model_question boolean not null
) on commit drop;

insert into import_public_review_question_bank (
  id,
  week,
  topic,
  prompt,
  kind,
  choices,
  correct_choice_index,
  explanation,
  is_model_question
)
values
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'Which action can forbid wine for both drinking and benefit according to the S”A?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Touching the outside of the bottle', 'Touching and shaking the wine', 'Looking at the wine', 'Moving a closed bottle'), 1, 'Full prohibition requires a libation-like act, especially shaking the wine.', true),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'A non-Jewish baby who touches wine forbids benefit from the wine.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'A baby lacks intent to touch for libation, so benefit is not forbidden.', true),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'A non-Jew put his hand into wine thinking it was oil. What is the basic status?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Forbidden for benefit', 'Completely permitted', 'Forbidden to drink, benefit permitted', 'Only the bottle is forbidden'), 2, 'Since he did not know it was wine, there is no concern for libation, but drinking remains prohibited.', true),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'If a non-Jew touches wine while busy measuring it, benefit may be permitted.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'His mind is occupied with measuring, not libation.', true),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'What are the four criteria for wine to become fully forbidden through touching?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Age, ownership, color, taste', 'Pouring, drinking, cooking, sealing', 'Bottle, cork, label, cap', 'Intent, knowledge, no distraction, shaking'), 3, 'The S”A requires intent to touch, knowledge it is wine, lack of distraction, and shaking.', true),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'A non-Jew places a finger into wine but does not shake it. What is the basic rule?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Forbidden to drink, benefit permitted', 'Forbidden for benefit', 'Completely permitted', 'Only the glass is forbidden'), 0, 'Touching creates a drinking concern, but without shaking there is no libation-like action to forbid benefit.', true),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'Accidental indirect contact, such as a sleeve dipping into wine, may leave the wine permitted even to drink.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'There is neither direct contact nor intent to touch the wine.', true),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'According to the S”A, a non-Jew lifts a bottle and pours wine without shaking. What happens?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Forbidden for benefit', 'Forbidden to drink, benefit permitted', 'Completely permitted', 'Only the cup is permitted'), 1, 'His force is treated like touching, but without shaking benefit is permitted.', true),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'What is the Rama’s major leniency about many non-Jews today?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('They cannot pour wine at all', 'They only forbid sealed bottles', 'Their contact is treated as lacking intent for libation', 'They always forbid benefit'), 2, 'The Rama treats contact of today’s non-Jews as downgraded because they do not perform libations.', true),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'According to the Rama, a non-Jewish waiter removing a fly from wine with a spoon can leave the wine permitted to drink.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'It is indirect contact and is treated as without intent for libation.', true),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'A waiter accidentally puts his finger into a glass of wine while serving. According to the Rama, what is the result?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The wine is forbidden for benefit', 'Only the bottle is forbidden', 'It must be sold', 'The wine may be drunk'), 3, 'Accidental contact is lowered a level according to the Rama.', false),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'The Rama says the lenient halacha about a Christian pouring wine should be publicized broadly.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'The Rama specifically says not to publicize this leniency before an am ha’aretz.', false),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'A non-Jew only touches the outside of an open wine bottle without moving it. What is the halacha?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Permitted', 'Forbidden to drink', 'Forbidden for benefit', 'Depends on the color'), 0, 'Touching the outside of the bottle does not count as touching or moving the wine.', false),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'A non-Jew lifts a wine glass to clean under it and puts it down without shaking. What is the halacha?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Forbidden to drink', 'Permitted to drink', 'Forbidden for benefit', 'Requires sixty'), 1, 'Lifting without shaking for a different purpose is not considered libation-like contact.', false),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'Shaking a closed bottle of wine forbids the wine.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'Closed wine is not offered as a libation, so shaking a closed bottle does not forbid it.', false),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'A non-Jew moves a closed leftover wine bottle from the table to the kitchen. What is the status?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Forbidden to drink', 'Forbidden for benefit', 'Permitted', 'Only permitted if mevushal'), 2, 'A closed bottle remains permitted even if it is moved or shaken in the process.', false),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'According to the S”A, shaking an open bottle without lifting it can forbid benefit.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The S”A treats shaking open wine as libation-like even without lifting.', false),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'According to the Rama, shaking open wine without lifting is generally treated how?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Always forbidden for benefit', 'Always forbidden to drink', 'Like cooking wine', 'Permitted in cases of loss'), 3, 'The Rama does not view shaking without lifting as a normal form of libation, though he limits reliance on this.', false),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'If a Muslim pours wine without shaking, what does the Shach say based on the S”A’s downgrade principle?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It may even be drunk', 'It is forbidden for benefit', 'It must be thrown out', 'It needs two seals'), 0, 'A Muslim does not create the libation concern, so the prohibition is lowered one level.', false),
  (gen_random_uuid(), 13, 'Week 13 Quick Review', 'All forms of contact by a non-Jew have the same halachic result.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'The Tur and S”A distinguish between full prohibition, drinking-only prohibition, and no prohibition.', false),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'According to Rav Moshe, do gloves make a non-Jew’s pouring into indirect contact?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Yes', 'No', 'Only for Muslims', 'Only with mevushal wine'), 1, 'Rav Moshe writes that gloves do not make the contact indirect.', true),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'Lema’ase, why did Rav Moshe not allow hiring non-Jews to pour wine at a catering job?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Gloves always help', 'Mevushal wine is always forbidden', 'It is intentional and the bottles may be left unattended', 'There is no concern at all'), 2, 'The Shach’s leniency is for loss, and waiters may touch or shake unattended wine.', true),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'According to the Shach, Ashkenazim may rely on the Rama for wine poured by Christians mainly in a case of significant loss.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The Shach limits reliance on that Rama to a case of loss.', true),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'What is nitzok?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('A special seal on a bottle', 'A type of mevushal wine', 'A non-Jewish worker', 'A pouring stream that connects two wines'), 3, 'Nitzok treats the stream of wine as connecting the upper and lower containers.', true),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'How can one avoid nitzok when filling a bottle that contains forbidden wine?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Pour in disconnected short bursts', 'Pour faster', 'Use a bigger bottle', 'Wear gloves'), 0, 'The stream should break before reaching the lower container.', true),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'The S”A rules that nitzok never applies.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'The S”A is machmir like Rashi that nitzok can forbid the wine above.', true),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'When does the S”A allow relying on Rabbeinu Tam that nitzok is not a connection?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Whenever the bottle is small', 'In a large financial loss', 'Only on Shabbos', 'Only by a Muslim'), 1, 'The S”A allows leniency for a large barrel or significant loss.', true),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'According to the Shach, nitzok applies only when the lower wine is what?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Mevushal', 'Owned by a Jew', 'Forbidden for drinking and benefit', 'Frozen'), 2, 'If the lower wine is only forbidden to drink, nitzok does not forbid the upper wine.', true),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'Rav Ovadya rules that wine poured by a Muslim may not be drunk, but benefit is permitted.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'He lowers the prohibition one level but still forbids drinking.', true),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'According to Rav Ovadya, does nitzok forbid the remaining bottle when a Muslim poured the wine?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Yes, always', 'Only if the bottle is sealed', 'Only if it is mevushal', 'No'), 3, 'Since the poured wine is permitted in benefit, nitzok does not forbid the remaining wine.', true),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'According to Rav Dovid Teherani, what is best regarding a Muslim or public Shabbos violator pouring wine?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Be machmir not to allow it, but be lenient if already done', 'Always throw it away', 'Permit lechatchilla always', 'Only use gloves'), 0, 'He says it is best to be machmir beforehand, but there is room to be lenient after the fact.', false),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'For Ashkenazim, the Shach is stricter with Muslims than with Christians.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'The Shach is more lenient with Muslims and permits wine they poured even lechatchilla.', false),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'Why is there more room to be lenient with wine poured by many non-religious Jews today?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('They are all non-Jews', 'Many may not have the full status of public Shabbos violators', 'Their wine is always mevushal', 'They cannot own wine'), 1, 'Many are traditional, respectful, or tinokos shenishbu according to some opinions.', false),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'At a kiruv Shabbos meal, why should the wine ideally be mevushal?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Mevushal wine is never kosher', 'It tastes better', 'Guests may handle or pour wine', 'It needs no cup'), 2, 'Mevushal wine avoids many problems when non-religious Jews may handle wine.', false),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'A non-religious waiter opening a bottle is always exactly the same as touching the wine itself.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'Opening may not necessarily move or shake the wine, so there are additional reasons for leniency in some cases.', false),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'When there is no need for wine and a non-religious waiter may be offended, what is best?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Ask him to pour more', 'Throw out every bottle', 'Use only grape juice without hechsher', 'Do not order the wine'), 3, 'The notes advise avoiding the situation when the wine is not necessary.', false),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'At a Sheva Brachos, why might one be lenient if a non-religious waiter opens the bottle?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Need for wine and possible embarrassment', 'Opening always makes wine mevushal', 'The waiter is wearing gloves', 'There is no such custom'), 0, 'The need for wine and concern for embarrassment combine with halachic reasons for leniency.', false),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'Rav Ovadya is fully lenient lechatchilla with wine poured by a Muslim.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'Rav Ovadya forbids drinking wine poured by a Muslim.', false),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'What is the main reason nitzok mattered in the Week 14 discussion?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It defines a double seal', 'It explains why poured wine may affect the bottle', 'It changes wine into vinegar', 'It permits all Christian wine'), 1, 'The discussion used nitzok to explain why pouring can create broader consequences.', false),
  (gen_random_uuid(), 14, 'Week 14 Quick Review', 'According to the custom discussed, many Jews avoid wine poured by Christians, Muslims, and non-religious Jews.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The notes emphasize that the widespread custom is stricter than some basic halachic conclusions.', false),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'According to the S”A, what can nitzok do?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Make wine mevushal', 'Create a double seal', 'Forbid wine remaining in the bottle', 'Permit all leftovers'), 2, 'Nitzok connects the poured stream to the forbidden wine below.', true),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'Rabbeinu Tam holds nitzok is not considered a halachic connection.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The S”A is machmir like Rashi, but Rabbeinu Tam is lenient.', true),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'According to the Rama, what is considered a small loss for nitzok?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('A large barrel', 'A whole storehouse', 'Only a sealed case', 'Wine left in a cup or bottle'), 3, 'The Rama treats wine in a cup or bottle as a small loss, while a barrel can be a great loss.', true),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'A Jew tops off a non-Jew’s glass that still has leftover forbidden wine. What may happen?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The wine in the bottle can become forbidden through nitzok', 'Nothing can happen', 'The cup becomes a seal', 'The wine becomes mevushal'), 0, 'The stream can connect the bottle to the forbidden wine in the cup.', true),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'If leftover wine in the cup is completely dried and would not wet your hand, nitzok does not forbid the bottle.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Dry residue is not considered wine that can connect through nitzok.', true),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'According to the Rama, what can permit the bottle if only a few drops remain in the non-Jew’s cup?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('A glove', 'Sixty times in the bottle against the drops', 'A silver foil', 'A new label'), 1, 'The Rama allows the bottle when the remaining bottle wine has shishim against the drops.', true),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'A full 750 ml bottle has shishim against about how much leftover wine?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Exactly 100 ml', 'Half a cup', 'Less than 12.5 ml', 'One full glass'), 2, '750 divided by 60 equals 12.5 ml.', true),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'One may intentionally pour into forbidden drops because the bottle has shishim.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'One may not deliberately create a situation that relies on bitul lechatchilla.', true),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'Why is a public wine festival a concern?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('All wine festivals use corks', 'Wine cannot be sampled', 'Only old wine is kosher', 'A non-Jew’s leftover wine may forbid bottles through nitzok'), 3, 'If a non-Jew’s glass is refilled, his leftover wine may affect the bottle.', true),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'At a restaurant, a non-Jew tasted from a glass and a Jew refills it. Why is the bottle often still permitted after the fact?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('There is usually shishim in the bottle against the remaining wine', 'The waiter is standing', 'The glass is expensive', 'The bottle has two labels'), 0, 'Only a small taste was poured, so the bottle commonly has sixty against the leftover wine.', true),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'What is the best way to avoid nitzok at a tasting with non-Jewish guests?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Pour faster', 'Give a new glass for refills', 'Use the same glass for everyone', 'Put gloves on guests'), 1, 'A new glass avoids pouring into leftover wine from a non-Jew’s cup.', false),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'Mevushal wine poured into a cup containing forbidden non-mevushal wine can never create nitzok.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'The Imrei Eish cited by the Darchei Teshuva applies nitzok even with mevushal wine poured into forbidden non-mevushal wine.', false),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'If a Muslim or non-religious Jewish guest asks for more wine, what is a key reason to be more lenient about nitzok?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Their cups are always clean', 'They cannot drink wine', 'Their leftover wine is not forbidden in benefit according to many opinions', 'The bottle is closed'), 2, 'Nitzok generally requires the lower wine to be forbidden in benefit.', false),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'What is the main topic of the second part of Week 15?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Cooking wine', 'Buying whiskey', 'Dairy equipment', 'Leaving wine unattended with a non-Jew'), 3, 'The notes move from nitzok to wine left unattended.', false),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'According to the S”A, wine left unattended with an idol worshiper can become forbidden immediately.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'There is concern he touched it for libation.', false),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'Wine left unattended with a non-idol worshipping non-Jew becomes forbidden after what amount of time?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The time to walk a mil', 'One full day', 'Three days', 'Immediately in every case'), 0, 'The concern is switching wine, measured by the time to walk a mil.', false),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'What is the usual mil time mentioned in the notes?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('2 minutes', '18-24 minutes', '6 hours', 'A full week'), 1, 'The notes give the time to walk a mil as 18-24 minutes.', false),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'If there is concern the non-Jew may drink from the wine, it can become prohibited immediately.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The Shach adds that drinking concern can make it prohibited immediately.', false),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'Which option permits unattended wine lechatchilla according to the notes?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('No label', 'A smaller bottle', 'Double seal or yotzei v’nichnas', 'A darker color'), 2, 'A double seal or coming in and out prevents concern of touching or switching.', false),
  (gen_random_uuid(), 15, 'Week 15 Quick Review', 'Wine left unattended with a Muslim in a Jew’s home for a mil becomes forbidden for benefit.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'It becomes forbidden to drink but remains permitted for benefit.', false),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'What does the S”A require to send regular wine with a non-Jew?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('No seal', 'Only a paper bag', 'One ordinary cork always', 'Two seals, or one seal and a lock'), 3, 'Wine needs a double seal because of the concern for libation.', true),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'Mevushal wine requires the same two seals as regular non-mevushal wine.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'Mevushal wine is not used for libation, so one seal is enough.', true),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'Why can a strong seal work?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It is hard to remove or duplicate without detection', 'It changes the wine taste', 'It makes wine mevushal', 'It removes ownership'), 0, 'A valid seal creates effort or evidence if tampered with.', true),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'Why are screw caps with a safety ring generally treated well?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('They are always mevushal', 'Opening breaks the ring and is obvious', 'They have no wine inside', 'They need no hechsher'), 1, 'Once opened, the broken safety ring cannot remain attached normally.', true),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'A screw cap with a tamper-evident ring may be left unattended with a non-Jew.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The broken ring would show that the bottle was opened.', true),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'What are the two parts of many corked wine bottles that may form a double seal?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Label and color', 'Glass and liquid', 'Cork and tamper-evident foil', 'Box and receipt'), 2, 'The cork plus non-restorable foil can count as two coverings.', true),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'If the foil was removed from a corked bottle, what is the issue?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The wine becomes cooked', 'The wine is automatically treif', 'The cork becomes dairy', 'Only one clear seal may remain according to some'), 3, 'Some require the foil together with the cork for a double seal.', true),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'Champagne corks may be stronger because they expand after removal and cannot be reinserted normally.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Once removed, they generally cannot be replaced without special machinery.', true),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'What is the best option for an opened bottle left with a non-Jew?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Create a double seal around it', 'Leave it open on the counter', 'Ask the non-Jew not to look', 'Put it near the door'), 0, 'The notes present creating a double seal as the best option.', true),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'What is one way to create a double seal on an open bottle?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Put it in the fridge uncovered', 'Bag it, tape it, and sign across the tape and bag', 'Write kosher on the bottle', 'Use a napkin'), 1, 'A sealed bag plus signed tape can show tampering and function as two seals.', true),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'According to Avnei Derech, what kind of combination lock is clearly sufficient as a seal?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('One-digit lock', 'No lock', 'Four-digit lock', 'Unlocked cap'), 2, 'A four-digit code takes substantial effort to hack.', false),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'Avnei Derech considers every three-digit lock certainly valid without dispute.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'He is concerned a three-digit lock can be hacked quickly, though others are lenient.', false),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'According to Rav Neventzal, how is a wine-bottle lock viewed?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It never helps', 'It only helps for milk', 'It makes wine mevushal', 'The lock itself may be a double seal'), 3, 'He is more lenient because removing the lock requires great effort.', false),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'According to the Rama, one seal for wine may help when?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Be’dieved', 'Never', 'Only for champagne', 'Only before opening'), 0, 'The Rama allows one seal be’dieved.', false),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'The Aruch Hashulchan is more lenient and allows one seal today even lechatchilla.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'He says non-Jews today are not passionate about libation in the same way.', false),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'What is yotzei v’nichnas?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('A double knot', 'A Jew comes in and out so the non-Jew fears being caught', 'A type of wine bottle', 'A way to cook wine'), 1, 'The possibility of being caught prevents concern that the non-Jew touched the wine.', false),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'When can cameras help with unattended wine?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Only when hidden from the Jew', 'Only if the wine is old', 'When the non-Jew knows they are being recorded', 'Never'), 2, 'Cameras create a yotzei v’nichnas-like fear because the Jew can check at any time.', false),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'A shul janitor’s fear of losing his job or damaging the relationship can help permit wine be’dieved.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The notes cite this as a reason for leniency in shul cases.', false),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'For an elderly person with live-in help, what is a good solution for open wine?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Leave it on the table', 'Ask the aide to pour it', 'Remove the cork', 'Lock it, seal it, use cameras, or have family able to enter'), 3, 'These solutions create protection or fear of being caught.', false),
  (gen_random_uuid(), 16, 'Week 16 Quick Review', 'Why can hidden wine remain permitted in an Airbnb case?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The non-Jew did not know about it and would not search for it', 'The bottle became mevushal', 'All Airbnb guests are Jewish', 'Wine in a closet is always sealed'), 0, 'If the non-Jew is unaware and it is well hidden, there is no concern he searched for it.', false);

do $$
declare
  author_id uuid;
  inserted_count integer;
begin
  select profile.id
  into author_id
  from public.profiles profile
  where profile.role = 'global_admin'
  order by profile.created_at, profile.email
  limit 1;

  if author_id is null then
    raise exception 'No global_admin profile found. Create/promote a Global Admin before importing review questions.';
  end if;

  delete from public.review_questions question
  where question.is_library_question = true
    and question.visibility = 'everyone'::public.content_visibility
    and question.week between 13 and 16;

  insert into public.review_questions (
    id,
    chaburah_id,
    topic,
    week,
    prompt,
    kind,
    choices,
    visibility,
    enabled,
    created_by,
    created_at,
    updated_at,
    publication_status,
    source_question_id,
    is_library_question,
    published_at,
    is_model_question
  )
  select
    import_question.id,
    null,
    import_question.topic,
    import_question.week,
    import_question.prompt,
    import_question.kind,
    import_question.choices,
    'everyone'::public.content_visibility,
    true,
    author_id,
    now(),
    now(),
    'published',
    null,
    true,
    now(),
    import_question.is_model_question
  from import_public_review_question_bank import_question;

  get diagnostics inserted_count = row_count;

  insert into public.review_question_answers (
    question_id,
    correct_choice_index,
    explanation
  )
  select
    import_question.id,
    import_question.correct_choice_index,
    import_question.explanation
  from import_public_review_question_bank import_question;

  raise notice 'Imported % public review questions.', inserted_count;
end
$$;

commit;

select
  question.week,
  count(*) as public_library_questions,
  count(*) filter (where question.is_model_question) as model_questions
from public.review_questions question
where question.is_library_question = true
  and question.visibility = 'everyone'::public.content_visibility
  and question.week between 13 and 16
group by question.week
order by question.week;
