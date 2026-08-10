alter table public.tracks add column if not exists postal_code text;

update public.tracks set address = '9201 Circuit of the Americas Blvd.', city = 'Austin', region = 'TX', postal_code = '78617' where name = 'Circuit of the Americas';
update public.tracks set address = '7629 North FM 51', city = 'Decatur', region = 'TX', postal_code = '76234' where name in ('Eagles Canyon Raceway', 'ECR SHORT');
update public.tracks set address = '1001 County Road 526', city = 'Anna', region = 'TX', postal_code = '75409' where name = 'G2 MOTORSPORT PARK';
update public.tracks set address = '59901 E. 5500 Road', city = 'Jennings', region = 'OK', postal_code = '74038' where name = 'Hallett Motor Racing Circuit';
update public.tracks set address = '9012 Performance Court', city = 'Cresson', region = 'TX', postal_code = '76035' where name = 'Motorsport Ranch';
