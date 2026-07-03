# Concepts

## Main Components

* Autopass
* Hypercore
* Corestore
* RocksDB
* Hyperswarm

## Adding elements to the note

The app it's a collaborative notes app:I can crate a note, add entries, share the note with other users, then other users can add/delete entries, the changes are synced between all the users and we all have the same list. All this in P2P.

### Hypercore: 
* An **Hypercore** is a data structure that acts like a log.
* It lives in RAM memory as a functional Hypercore object.
* It creates a private key and a public key for the note
* The public key is used to share the note with other users, while the private key is used to sign and verify changes made to the note.

#### Note workflow
**0. Note creation workflow**
* I create a note `shopping list`
* A new Hypercore instance is created for the note
> Question: What is Coresotre??? Where does it come into play in this workflow? 
* **Hypercore** creates a private key `privKey1` and a public key `pubKey1`
* I can share the note with other users by giving them the public key `pubKey1`
* A new folder in my phone disk system: `pubKey1 / db` with the log, sst and blob files and `pubKey1 / CORESTORE` file with the platform, inode and date of creation.
> Question: Is the folder named after the public key? Is it created by Hypercore or RocksDB?
* A new **RocksDB** instance to store the note's data

**1. 1st entry workflow:**
* I open the list `shopping list` and add an entry `milk` to the note
* Calculates `milk` hash: `hash1` 
* Takes the hash and my private key `privKey1` to create a signature: `sig1`
* Stores the entry `milk`, its hash `hash1`
* Signs the only entry in the note `hash1` with my private key `privKey1` to create a signature: `sig1`
* Converts the data to a format that can be stored in **RocksDB**, something like: `hypercore::pubKey1::data::0 -> "milk" + hash1 + sig1`
* ***RocksDB** stores the entry in its database files
  
**2. 2nd entry workflow:**
* I add another entry `eggs` to the note
* Calculates `eggs` hash: `hash2`
* Takes the hash and my private key `privKey1` to create a signature: `sig2`
* Takes the hash of the previous entry `milk` (`hash1`) 
* Combine the 2 hashes to create a new hash: `hash1_2` --> This is a **Merkle Tree** node that represents the combination of the two entries.
```
Level 1:        [hash1_2]
                /       \
Level 0:    [hash1]    [hash2] 
            "milk"     "eggs"
```
* Stores the entry `eggs` with its hash `hash2`
* Generates the new parent node `hash1_2`  that is the new root of the Merkle tree, representing the combination of the two entries `milk` and `eggs`.
* Signs the new top node `hash1_2` with my private key `privKey1` to create a signature: `sig1_2` and stores it in RocksDB


**3. 3rd entry workflow**
* I add another entry `bread` to the note
* Calculates `bread` hash: `hash3`
```
Level 1:        [hash1_2]
                /       \
Level 0:    [hash1]    [hash2]  [hash3]
            "milk"     "eggs"   "bread"
```
* In this case there're 2 roots of the Merkle Tree: `hash1_2` and `hash3`.
* Hypercore will pack the 2 roots into a combined root node `hash1_2_3` and sign it with my private key `privKey1` to create a signature: `sig1_2_3` and store it in RocksDB

**4. 4th entry workflow**
* I add another entry `butter` to the note
* Calculates `butter` hash: `hash4`
```
Level 2:             [    hash1_2_3_4   ]
                      /                \
Level 1:        [hash1_2]          [hash3_4]   
                /       \          /       \
Level 0:    [hash1]    [hash2]  [hash3]  [hash4]
            "milk"     "eggs"   "bread"  "butter"
```
* Generates the new parent node `hash3_4` that is the combination of the two entries `bread` and `butter` hashes.
* Generates the new root node `hash1_2_3_4` that is the combination of the two inner nodes `hash1_2` and `hash3_4`.
* Signs the new top node `hash1_2_3_4` with my private key `privKey1` to create a signature: `sig1_2_3_4` and store it in RocksDB

#### Questions

1. Is the workflow described above correct? 
2. Is all the described workflow managed by Hypercore only? Or Autobase? A combination?
3. RocksDB is just a dumb storage engine, doesn't manage the data flow, right? 
4. When does Corestore come into play in this workflow?
5. When I share the note I see I share a long string. What is this string exactly?
6. When and how does Hyperswarm come into play in this workflow? I guess I need to share the note. Can you explain me that part?


## RocksDB

everything in db/ is pure RocksDB. These are all standard RocksDB files:

- `*.sst`: The SST tables themselves
- `*.log`: Write-ahead log
- `*.blob`: Blob storage
- `CURRENT`, `MANIFEST-*`, `IDENTITY`, `LOCK`, `LOG`, `OPTIONS-*`, `STATS`: all RocksDB internals




## TODO

* Merkle Proof