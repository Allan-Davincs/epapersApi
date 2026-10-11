/** Small dependency-free checker for the JSON Schema features emitted by our Zod DTOs. */
export function validateContract(value, schema, schemas, path = '$') {
 const errors=[];
 if(!schema)return [path+': missing schema'];
 if(schema.$ref){const name=schema.$ref.split('/').at(-1);return validateContract(value,schemas[name],schemas,path);}
 if(schema.anyOf||schema.oneOf){const branches=schema.anyOf||schema.oneOf;const matches=branches.filter(s=>validateContract(value,s,schemas,path).length===0).length;if(!matches||(schema.oneOf&&matches!==1))errors.push(path+': no matching schema branch');return errors;}
 if(schema.const!==undefined&&value!==schema.const)errors.push(path+': wrong constant');
 if(schema.enum&&!schema.enum.includes(value))errors.push(path+': invalid enum');
 const type=value===null?'null':Array.isArray(value)?'array':typeof value;
 if(schema.type){const types=Array.isArray(schema.type)?schema.type:[schema.type];if(!types.some(t=>t===type||(t==='integer'&&type==='number'&&Number.isInteger(value))))return [path+': wrong type'];}
 if(type==='object'){
  for(const key of schema.required||[])if(!(key in value))errors.push(path+'.'+key+': required');
  for(const [key,item] of Object.entries(value)){if(schema.properties?.[key])errors.push(...validateContract(item,schema.properties[key],schemas,path+'.'+key));else if(schema.additionalProperties===false)errors.push(path+'.'+key+': unexpected field');else if(schema.additionalProperties&&typeof schema.additionalProperties==='object')errors.push(...validateContract(item,schema.additionalProperties,schemas,path+'.'+key));}
 }
 if(type==='array'){if(schema.minItems!==undefined&&value.length<schema.minItems)errors.push(path+': too few items');if(schema.maxItems!==undefined&&value.length>schema.maxItems)errors.push(path+': too many items');if(schema.items)for(let i=0;i<value.length;i++)errors.push(...validateContract(value[i],schema.items,schemas,path+'['+i+']'));}
 if(type==='number'){if(schema.minimum!==undefined&&value<schema.minimum)errors.push(path+': below minimum');if(schema.maximum!==undefined&&value>schema.maximum)errors.push(path+': above maximum');if(schema.exclusiveMinimum!==undefined&&value<=schema.exclusiveMinimum)errors.push(path+': below exclusive minimum');}
 if(type==='string'){
  if(schema.minLength!==undefined&&value.length<schema.minLength)errors.push(path+': too short');if(schema.maxLength!==undefined&&value.length>schema.maxLength)errors.push(path+': too long');if(schema.pattern&&!new RegExp(schema.pattern).test(value))errors.push(path+': pattern mismatch');
  if(schema.format==='uuid'&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))errors.push(path+': invalid UUID');if(schema.format==='date-time'&&!Number.isFinite(Date.parse(value)))errors.push(path+': invalid datetime');
 }
 return errors;
}
