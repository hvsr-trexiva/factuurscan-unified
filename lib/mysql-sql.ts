/** SQL compatibility for the finite SQLite/D1 query forms used by this app. */
export function mysqlSql(sql:string){
 sql=sql.replace(/INSERT OR IGNORE/gi,'INSERT IGNORE').replace(/ON CONFLICT\s*\([^)]*\)\s*DO NOTHING/gi,'ON DUPLICATE KEY UPDATE id=id').replace(/ON CONFLICT\s*\(key\)\s*DO UPDATE SET count=count\+1/gi,'ON DUPLICATE KEY UPDATE count=count+1');
 sql=sql.replace(/ON CONFLICT\s*\(request_id\)\s*DO UPDATE SET/gi,'ON DUPLICATE KEY UPDATE').replace(/excluded\.(\w+)/gi,'VALUES($1)');
 sql=sql.replace(/json_array_length\(/gi,'JSON_LENGTH(').replace(/json_extract\(([^(),]+),\s*('[^']*')\)/gi,'JSON_UNQUOTE(JSON_EXTRACT($1,$2))').replace(/\bjson\((\?|'[^']*')\)/gi,(_m,arg)=>`JSON_EXTRACT(${arg},'$')`);
 sql=sql.replace(/JSON_UNQUOTE\(JSON_EXTRACT\(([^(),]+),('[^']*')\)\)\s*=\s*1\b/gi,"JSON_UNQUOTE(JSON_EXTRACT($1,$2)) IN ('true','1')");
 // Quote reserved identifiers without altering literals, JSON paths or function names.
 sql = sql.replace(
  /'(?:''|[^'])*'|`[^`]*`|\b(key|until)\b/gi,
  (token, word, offset) => {
    if (
      word?.toLowerCase() === 'key' &&
      /ON\s+DUPLICATE\s+$/i.test(sql.slice(0, offset))
    ) {
      return token;
    }
    return word ? '`' + word + '`' : token;
  }
);
 return sql;
}
export function placeholderCount(sql:string){return (sql.replace(/'(?:''|[^'])*'/g,'').match(/\?/g)||[]).length;}
