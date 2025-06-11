const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('Data.db');
async function DataBase(Type, Table, columnPrimary, columnValue, Values) {
    let promise = new Promise((resolve, reject) => {
        if (Type === 'Delete' || Type === 'Update' || Type === 'Create') {
            let pending = 0;
            for (let key in Values) {
                pending++;
                const val = Values[key];
                let query, params;

                if (Type === 'Create') {
                    query = `INSERT OR REPLACE INTO ${Table} (${columnPrimary}, ${columnValue}) VALUES (?, ?)`;
                    params = [key, val];
                } else if (Type === 'Update') {
                    query = `UPDATE ${Table} SET ${columnValue} = ? WHERE ${columnPrimary} = ?`;
                    params = [val, key];
                } else if (Type === 'Delete') {
                    query = `DELETE FROM ${Table} WHERE ${columnPrimary} = ?`;
                    params = [key];
                }

                db.run(query, params, function(err) {
                    if (err) {
                        reject(err);
                    }
                    pending--;
                    if (pending === 0) {
                        resolve();
                    }
                });
            }
            if (pending === 0) resolve(); 
        } else {
            resolve(); 
        }
    });
    await promise
        .then(() => console.log('Success'))
        .catch((e) => console.error(e));
}
function checkTables() {
    db.all(`SELECT name FROM sqlite_master WHERE type='table'`, (err, tables) => {
        if (err) {
            console.error('Error fetching tables:', err.message);
        } else {
            console.log('Tables in the database:');
            tables.forEach(table => {
                console.log(`\nTable: ${table.name}`);
                
                db.all(`SELECT * FROM ${table.name}`, (err, rows) => {
                    if (err) {
                        console.error(`Error fetching rows from ${table.name}:`, err.message);
                    } else if (rows.length === 0) {
                        console.log('  (No rows)');
                    } else {
                        rows.forEach(row => {
                            console.log('  ', row);
                        });
                    }
                });
            });
        }
    });
}

function getValues(Table, searchField, searchValue, resultField) {
    let query = `SELECT ${resultField} FROM ${Table} where ${searchField} = ?`;
    let params = [searchValue];
    return new Promise((resolve, reject) => {
                db.get(query, params, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result[resultField]);
                    }
                });  
});}
function getValue(){
    
}
module.exports = { DataBase, checkTables, getValues };