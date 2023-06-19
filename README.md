# Word Dictionary

This is a toy project aimed to expand my understand of text processing, and how databases work with text data.

## Problem Description

Create a word dictionary API which returns the dictionary meaning of any given word.  It should return "No word exists" for a passed word which does not exist in the dictionary.

To expand on this simple problem statement, lets add one more constraint.  Do NOT use a database to store and serve the words, instead read it from a text file stored in a Non-volatile storage either locally or on a remote server.

## Tech Stack Used
- NodeJS for Server
- S3 for non-volatile storage of file


### Approach 1

When server boots up, read the file into memory.  And whenever we get a request, read the file byte-by-byte to figure out if given key exists in the dictionary file.  This approach is slow because it reads the entire file before serving any request. Another drawback is that if file is large enough which cannot be read into memory at once, then this approach fails.

Note that the dictionary key-value pair is structured in file such a way that in each line, key and value are separated by two spaces ( key name can also have one space), and from the key to the end of line is the value.

### Approach 2

Previous approach suffered from slowness, because it required reading entire file on every request to determine if a word exists and what is its value.  To solve for that, I generated a index of dictionary beforehand.  That index contained all the keys which are there in the dictionary. So whenever server gets a request, it first checks the index quickly to determine if key exists.  But what does this index contain and when is this created??

If I create index when server boots up, it will slow the server start time.  So I can use the fact that dictionary does not update often to my advantage, and create an index offline, and store the index into a file. So I don't need to generate it everytime server boots up, instead it can only be regenerated when dictionary is updated.  And regardless of the size of dictionary I can keep the index into the memory.

But If I keep index in a file other than the dictionary itself, then portability is hampered.  I want to keep both dictionary and index at the same place. So I keep the index in the same file as the dictionary itself.  Because dictionary is just a text file, it will be difficult to say when index ends and the actual dictionary starts.

Many formats solve this problem by adding a fixed length header at the beginning of the file.  This header contains information about the file like how long the file is and where does different sections start and end. In our case, we can use this header to include information about the index, like from which byte index starts and what is the length of index. Using this information, I can read the index from the file and can also know where the actual dictionary starts.  Why fixed length header though??  Because by keeping the header length fixed, I can precisely read only the header in the beginning without needing to read the entire file or big chunks of it.  But fixed length header also means that the size of index is limited by the byte length of the header part.

#### What should be stored in index?

This is such a naive question, or is it?? :thinking_face  Our index file is essentially a map of keys which exists in dictionary, so it makes sense to keep the value as true or false.  But at this point, values against key do not matter, because by design if a key exists in index then it exists in dictionary, its value is meaningless.  What if we can use value part for some other purpose??

After we have determined, if a key exists in index, next step is to read it from dictionary.  Because we don't want to read entire dictionary in memory at once then read it byte-by-byte what if we know where the value starts and how long is it in dictionary?  This way we won't need to scan all the text and our reads can be faster.  In index, against each value we can store two things - index at which the dictionary value starts, and its length.

```json
{
    "Aardvark":[168,83],
    "Aback":[306,70],
    "Abacus":[385,151],
    "Zygote":[4502483,92],
}
```

See `data.txt` for a fully formed header, index and dictionary file.

### How to update the dictionary?

So far we have dealt with dictionary which has some words and their meanings. As all things in world, dictionary also gets updated overtime, new words are added, some meanings are modified.  So how do we handle that usecase in our dictionary??

Let's imagine we got new key-value pairs in plain text file and now we have to update the dictionary.  We take the original dictionary and the new dictionary, then merge the key-value pair and generate a new updated dictionary file.  We merge new and existing data using `merge step` used in `merge sort`. It works well when there are two sorted datasets which are to be merged into one sorted dataset in `O(logN)` time where N is total number of elements in both datasets.

Once we have generated updated dictionary, then run it through the same process again to generate an index file, a header file and then merge them with dictionary into a single file.

## What happens when server starts?
1. Establish connection with S3
2. Read fixed size header using partial byte ranges S3
3. Get the length of index data and read the index using partial byte query from S3
4. Parse and load the index into memory
5. Whenever server receives a request for reading a key, first check if key exists in in-memory index. If does not exists then return error
6. If given exists in index, then read the index value to determine the start index and length of value in bytes for that key
7. Fire partial range read request to read value for that key from S3.


### Steps to run server
1. Download dictionary data into `dictionary.txt`
2. Run `scripts/generateData.js` which will generate `header.txt`, `index.txt` and `data.txt`
3. Upload `data.txt` to S3 in a bucket. `header.txt` and `index.txt` is just for debugging purposes.
4. Then install the deps `yarn install`
5. Start the server `yarn start`


### Steps to merge new data
1. Assume we got updated dictionary data in `update_dictionary.txt`. Some fields are added, some are modified.
2. Run `scripts/updateDictionary.txt`, it will generate `new_dictionary.txt`.
3. Then follow `Steps to run server`, but replace the usage of `dictionary.txt` with `update_dictionary.txt`


@TODO: Add bloom filters even before the index search.  It won't impact the system's performance but will be a good learning.