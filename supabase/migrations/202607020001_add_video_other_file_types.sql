-- Add clearer material types now that external links are handled separately from file type.

alter type public.learning_file_type add value if not exists 'video';
alter type public.learning_file_type add value if not exists 'other';
