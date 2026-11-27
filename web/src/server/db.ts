import {randomUUID} from 'node:crypto';
import {requestActor} from './request-context.ts';
import type {Category} from '../domain/category-tree.ts';
import {all,one,run,transaction} from '#database';
export {all,one,run,transaction};
export async function audit(action:string, detail:string, productId:string|null=null, projectId:string|null=null){await run('INSERT INTO audit(id,product_id,project_id,action,detail,created_at,actor_user_id) VALUES(?,?,?,?,?,?,?)',randomUUID(),productId,projectId,action,detail,new Date().toISOString(),requestActor.getStore()||null);}
export async function settings(){return (await one('SELECT * FROM site_settings WHERE id=1'));}
export async function categories(includeRetired = false): Promise<Category[]> {
 return (await all(`SELECT id,code,name,parent_id,position,deleted_at FROM category
  ${includeRetired ? '' : 'WHERE deleted_at IS NULL'} ORDER BY position,name COLLATE NOCASE,id`));
}
export async function options(projectCityId: number | null = null){return {presentations:(await all('SELECT p.*,c.name AS unit_name FROM presentation p JOIN commercial_unit c ON c.code=p.commercial_unit')),units:(await all('SELECT * FROM measure_unit')),facets:(await all('SELECT * FROM facet ORDER BY type,name')),cities:(await all('SELECT * FROM city WHERE deleted_at IS NULL OR id=? ORDER BY name',projectCityId)),sectors:(await all('SELECT * FROM sector'))};}
export async function images(kind:'product'|'project',id:string){return (await all(`SELECT m.id,m.original_name,m.width,m.height,i.alt,i.position FROM ${kind}_image i JOIN media m ON m.id=i.media_id WHERE i.${kind}_id=? AND i.deleted_at IS NULL ORDER BY i.position,m.id`,id));}
export async function product(idOrSlug:string,admin=false){
 const p=(await one(`SELECT p.*,c.name AS category,c.code AS category_code,c.group_code AS category_group,pr.name AS presentation,u.name AS unit_name FROM product p JOIN category c ON c.id=p.category_id JOIN presentation pr ON pr.code=p.presentation_code JOIN commercial_unit u ON u.code=pr.commercial_unit WHERE (p.id=? OR p.slug=?) ${admin?'':"AND p.deleted_at IS NULL AND p.state='published'"}`,idOrSlug,idOrSlug));
 if(!p)return null;
 p.images=(await images('product',p.id));p.measures=(await all('SELECT m.*,u.name,u.symbol FROM measure m JOIN measure_unit u ON u.code=m.unit_code WHERE m.product_id=? AND m.deleted_at IS NULL',p.id));
 p.facets=(await all('SELECT f.* FROM product_facet pf JOIN facet f ON f.id=pf.facet_id WHERE pf.product_id=? AND pf.deleted_at IS NULL',p.id));
 p.projects=(await all("SELECT pr.name FROM project pr JOIN project_product pp ON pp.project_id=pr.id WHERE pp.product_id=? AND pp.deleted_at IS NULL AND pr.state='published' AND pr.deleted_at IS NULL",p.id));
 if(admin)p.external_sku=(await one('SELECT external_sku FROM product_private WHERE product_id=?',p.id))?.external_sku||'';
 return p;
}
export async function products(params:URLSearchParams=new URLSearchParams(),admin=false){
 const where:string[]=[];const args:any[]=[];
 if(!admin)where.push("p.deleted_at IS NULL AND p.state='published'");
 if(admin && params.get('view')==='hidden')where.push('p.deleted_at IS NOT NULL');
 else if(admin)where.push('p.deleted_at IS NULL');
 if (params.get('discount') === '1') where.push('p.discount_price_cents > 0 AND p.discount_price_cents < p.price_cents');
 const q=(params.get('q')||'').slice(0,100).trim();
 if(q){where.push("(p.name LIKE ? ESCAPE '\\' OR p.sku LIKE ? ESCAPE '\\')");const term='%'+q.replace(/[\\%_]/g,'\\$&')+'%';args.push(term,term);}
 const branch = params.get('rama') || params.get('category')
  || (params.get('group') ? 'catalogo-' + params.get('group') : null);
 if (branch) {
  where.push(`p.category_id IN (
   WITH RECURSIVE branch(id) AS (
    SELECT id FROM category WHERE code=? AND deleted_at IS NULL
    UNION ALL
    SELECT child.id FROM category child JOIN branch ON child.parent_id=branch.id
     WHERE child.deleted_at IS NULL
   ) SELECT id FROM branch
  )`);
  args.push(branch);
 }
 if(params.get('presentation')){where.push('p.presentation_code=?');args.push(params.get('presentation'));}
 if(params.get('size')){where.push("EXISTS(SELECT 1 FROM technical_sheet ts WHERE ts.product_id=p.id AND ts.length_mm || 'x' || ts.width_mm=?)");args.push(params.get('size'));}
 // Price comparisons are only enabled for a selected category and presentation.
 const effectivePrice = 'CASE WHEN p.discount_price_cents > 0 AND p.discount_price_cents < p.price_cents THEN p.discount_price_cents ELSE p.price_cents END';
 const comparable=!!branch&&!!params.get('presentation');
 if(comparable && params.get('min')){const n=Number(params.get('min'));if(Number.isFinite(n)){where.push(effectivePrice + '>=?');args.push(Math.round(n*100));}}
 if(comparable && params.get('max')){const n=Number(params.get('max'));if(Number.isFinite(n)){where.push(effectivePrice + '<=?');args.push(Math.round(n*100));}}
 const sort=params.get('sort');const order=comparable&&sort==='price-up'?effectivePrice + ' ASC,p.id ASC':comparable&&sort==='price-down'?effectivePrice + ' DESC,p.id ASC':sort==='name'?'p.name ASC':'p.featured DESC,p.created_at DESC,p.name ASC';
 return (await all(`SELECT p.*,c.name AS category,c.code AS category_code,c.group_code AS category_group,pr.name AS presentation,u.name AS unit_name,(SELECT media_id FROM product_image WHERE product_id=p.id AND deleted_at IS NULL ORDER BY position LIMIT 1) AS cover FROM product p JOIN category c ON c.id=p.category_id JOIN presentation pr ON pr.code=p.presentation_code JOIN commercial_unit u ON u.code=pr.commercial_unit ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY ${order}`, ...args));
}
export async function projects(admin=false,hidden=false){return (await all(`SELECT pr.*,c.name AS city,s.name AS sector,(SELECT media_id FROM project_image WHERE project_id=pr.id AND deleted_at IS NULL ORDER BY position LIMIT 1) AS cover FROM project pr JOIN city c ON c.id=pr.city_id JOIN sector s ON s.id=pr.sector_id WHERE ${admin?(hidden?'pr.deleted_at IS NOT NULL':'pr.deleted_at IS NULL'):"pr.deleted_at IS NULL AND pr.state='published'"} ORDER BY pr.featured DESC,pr.name`));}
export async function project(idOrSlug:string,admin=false){
 const data=await one(`SELECT pr.*,c.name AS city,s.name AS sector FROM project pr
  JOIN city c ON c.id=pr.city_id JOIN sector s ON s.id=pr.sector_id WHERE (pr.id=? OR pr.slug=?)
  ${admin?'':"AND pr.deleted_at IS NULL AND pr.state='published'"}`,idOrSlug,idOrSlug);
 if(!data)return null;
 const [gallery,links,materials]=await Promise.all([
  images('project',data.id),
  all('SELECT product_id FROM project_product WHERE project_id=? AND deleted_at IS NULL ORDER BY position',data.id),
  all(`SELECT p.*,c.name AS category,u.name AS unit_name,
    (SELECT media_id FROM product_image WHERE product_id=p.id AND deleted_at IS NULL ORDER BY position LIMIT 1) AS cover
    FROM project_product link JOIN product p ON p.id=link.product_id JOIN category c ON c.id=p.category_id
    JOIN presentation pr ON pr.code=p.presentation_code JOIN commercial_unit u ON u.code=pr.commercial_unit
    WHERE link.project_id=? AND link.deleted_at IS NULL ${admin?'':"AND p.deleted_at IS NULL AND p.state='published'"}
    ORDER BY link.position`,data.id),
 ]);
 return {...data,images:gallery,product_ids:links.map(row=>row.product_id),products:materials};
}
export async function mediaVisible(id:string){return !!(await one(`SELECT 1 WHERE EXISTS(SELECT 1 FROM product_image i JOIN product p ON p.id=i.product_id WHERE i.media_id=? AND i.deleted_at IS NULL AND p.deleted_at IS NULL AND p.state='published') OR EXISTS(SELECT 1 FROM project_image i JOIN project pr ON pr.id=i.project_id WHERE i.media_id=? AND i.deleted_at IS NULL AND pr.deleted_at IS NULL AND pr.state='published') OR EXISTS(SELECT 1 FROM slide WHERE media_id=? AND active=1 AND deleted_at IS NULL) OR EXISTS(SELECT 1 FROM site_settings WHERE about_media_id=?)`,id,id,id,id));}
