-- Repara nombres de categorias con acentos mal codificados (ej. "Super" guardado con
-- los bytes UTF-8 leidos como Latin-1). Pasa si el seed se pego con la codificacion
-- equivocada. Escrito solo con ASCII (chr) para que no se rompa al copiarlo.
-- Solo toca filas con el patron roto; si no hay ninguna, no hace nada.
update public.categories
set name =
  replace(replace(replace(replace(replace(replace(name,
    chr(195) || chr(161), chr(225)),  -- a con tilde
    chr(195) || chr(169), chr(233)),  -- e con tilde
    chr(195) || chr(173), chr(237)),  -- i con tilde
    chr(195) || chr(179), chr(243)),  -- o con tilde
    chr(195) || chr(186), chr(250)),  -- u con tilde
    chr(195) || chr(177), chr(241))   -- enie
where name like '%' || chr(195) || '%';
