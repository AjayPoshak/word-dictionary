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

Many formats solve this problem but adding a fixed length header at the beginning of the file.  This header contains information about the file like how long the file is and where does different sections start and end. In our case, we can use this header to include information about the index, like from which byte index starts and what is the length of index. Using this information, I can read the index from the file and can also know where the actual dictionary starts.  Why fixed length header though??  Because by keeping the header length fixed, I can precisely read only the header in the beginning without needing to read the entire file or big chunks of it.  But fixed length header also means that the size of index is limited by the byte length of the header part.


@TODO: Add bloom filters even before the index search.  It won't impact the system's performance but will be a good learning.