import React, { useState } from 'react';
import { parseEther, useQuery } from '@extension/shared';
import {
  getClaimsFromFollowingAboutSubject,
  searchAtomsByUriQuery,
  base,
  useWaitForTransactionEvents,
} from '@extension/shared';
import { useMultiVault } from '@extension/shared';
import { Spinner } from './Spinner.js';
import { AtomForm } from './AtomForm.js';
import { Atom, AtomCard } from './AtomCard.js';
import { currentTabStorage, currentAccountStorage, currentChainStorage } from '@extension/storage';

import { useStorage } from '@extension/shared';

export const Home: React.FC = () => {
  const wait = useWaitForTransactionEvents();
  const currentTab = useStorage(currentTabStorage);
  const currentAccount = useStorage(currentAccountStorage);
  const currentChain = useStorage(currentChainStorage);
  const [showAtomForm, setShowAtomForm] = useState(false);
  const { multivault } = useMultiVault();
  const [showTagSearch, setShowTagSearch] = useState(false);
  const [selectedTag, setSelectedTag] = useState<any>(null);

  const { data, error, refetch, loading } = useQuery(searchAtomsByUriQuery, {
    variables: {
      uri: currentTab?.url || '',
      address: currentAccount?.toLocaleLowerCase() || '',
    },
    skip: !currentTab?.url,
    fetchPolicy: 'cache-and-network',
  });
  const openAtom = (id: number) => {
    const url = currentChain === base.id ? 'https://app.i7n.xyz/a' : 'https://dev.i7n.xyz/a';
    chrome.tabs.create({ url: `${url}/${id}` });
  };

  const handleTagSelected = async (tag: any, atomId: number) => {
    if (!currentAccount) {
      // open options page
      chrome.runtime.openOptionsPage();
      return;
    }
    console.log('tag selected', tag);
    setSelectedTag(tag);
    setShowTagSearch(false);
    const subjectId = BigInt(atomId);
    const predicateId = BigInt(4);
    const objectId = BigInt(tag.id);

    // check if triple exists
    const tripleExists = await multivault.getTripleIdFromAtoms(subjectId, predicateId, objectId);
    const config = await multivault.getGeneralConfig();
    if (tripleExists) {
      console.log('Triple exists');
      const { hash } = await multivault.depositTriple(tripleExists, config.minDeposit);
      wait(hash);
    } else {
      console.log('Triple does not exist');
      const { hash } = await multivault.createTriple({
        subjectId,
        predicateId,
        objectId,
        initialDeposit: config.minDeposit,
      });
      wait(hash);
    }

    setSelectedTag(null);
    refetch();
  };

  const useClaimsFromFollowing = (address: string | undefined, subjectId: number) => {
    const { data } = useQuery(getClaimsFromFollowingAboutSubject, {
      variables: {
        address: address as string,
        subjectId,
      },
      skip: !subjectId || !address,
    });
    return data?.claims_from_following || [];
  };

  if (error) {
    return <div className="text-red-500">{error.message}</div>;
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center p-2">
        <Spinner />
      </div>
    );
  }
  const handleAtomClick = (atomId: number, myPosition: string | undefined) => {
    if (!currentAccount) {
      // open options page
      chrome.runtime.openOptionsPage();
      return;
    }
    if (myPosition) {
      redeem(atomId, myPosition);
    } else {
      deposit(atomId);
    }
  };

  const deposit = async (atomId: number) => {
    try {
      if (!currentAccount) {
        throw new Error('No account found');
      }

      console.log(`Depositing for atom ${atomId} from account ${currentAccount}`);

      const config = await multivault.getGeneralConfig();
      const { hash } = await multivault.depositAtom(BigInt(atomId), config.minDeposit);
      console.log(`Transaction hash: ${hash}`);
      wait(hash);
      refetch();
    } catch (error: any) {
      console.log('Error during deposit:', error.message);
    }
  };

  const redeem = async (atomId: number, myPosition: string) => {
    try {
      const { hash } = await multivault.redeemAtom(BigInt(atomId), BigInt(myPosition));
      console.log(`Transaction hash: ${hash}`);
      wait(hash);
      refetch();
    } catch (error: any) {
      console.log('Error during redeem:', error.message);
    }
  };

  if (!data?.atoms || data.atoms.length === 0 || showAtomForm) {
    const handleRefetch = () => {
      refetch();
      setShowAtomForm(false);
    };
    return (
      <>
        <AtomForm refetch={handleRefetch} />
        <div className="flex justify-end items-center p-2 space-x-2">
          {showAtomForm && (
            <button
              onClick={() => setShowAtomForm(false)}
              className="p-1 px-4 bg-slate-800 text-slate-300 rounded-full hover:bg-slate-600 text-sm">
              Cancel
            </button>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 px-4 bg-slate-800 text-slate-300 rounded-full hover:bg-slate-600 text-sm">
            {loading ? <Spinner /> : 'Refresh'}
          </button>
        </div>
      </>
    );
  }
  // const usd = data.chainLinkPrices[0].usd;
  const usd = 3302.34864192; // hardcoded for now:w

  return (
    <>
      {data.atoms.map(atom => (
        <AtomCard
          key={atom.id}
          atom={atom as Atom}
          account={currentAccount}
          usd={usd}
          handleTagSelected={handleTagSelected}
          handleAtomClick={handleAtomClick}
          openAtom={openAtom}
          useClaimsFromFollowing={useClaimsFromFollowing}
          refetch={refetch}
        />
      ))}
      {!showAtomForm && (
        <div className="flex justify-end items-center p-2 space-x-2">
          <button
            onClick={() => setShowAtomForm(true)}
            className="p-1 px-4 bg-slate-800 text-slate-300 rounded-full hover:bg-slate-600 text-sm">
            Add
          </button>
          <button
            onClick={() => refetch()}
            className="p-1 px-4 bg-slate-800 text-slate-300 rounded-full hover:bg-slate-600 text-sm">
            {loading ? <Spinner /> : 'Refresh'}
          </button>
        </div>
      )}
    </>
  );
};
