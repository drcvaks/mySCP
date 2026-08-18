-- Derive Shiur Builder coverage from published review packets.

create or replace view public.review_packet_content_coverage as
select
  packet.chaburah_id,
  packet.week,
  packet.id as packet_id,
  packet.title as packet_title,
  item.chunk_id,
  chunk.chunk_code,
  chunk.section_key,
  chunk.section_title,
  chunk.source_type,
  packet.published_at
from public.review_packets packet
join public.review_packet_items item
  on item.packet_id = packet.id
join public.content_chunks chunk
  on chunk.id = item.chunk_id
where packet.status = 'published'::public.review_packet_status;

grant select on public.review_packet_content_coverage to authenticated;
