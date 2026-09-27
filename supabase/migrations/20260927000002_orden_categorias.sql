-- Comida pasa a ser la primera categoría (la más usada), como en el diseño.
update public.categories set sort = 1 where parent_id is null and name = 'Comida';
update public.categories set sort = 2 where parent_id is null and name = 'Vivienda';
