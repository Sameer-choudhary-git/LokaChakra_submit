import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { BN, Program } from '@coral-xyz/anchor';
import * as token from '@solana/spl-token';
import * as spl from '@solana/spl-token';
import { PDAHelper } from './pda-helpers';
import { EmployeeStatus } from './types';
import { utils } from './utils';
import { cacheManager } from '../utils/cache';
import { TimeoutOperations } from '../utils/timeout-wrapper';
import { MPL_TOKEN_METADATA_PROGRAM_ID as METADATA_PROGRAM_ID_RAW } from '@metaplex-foundation/mpl-token-metadata';

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  METADATA_PROGRAM_ID_RAW.toString()
);

export class TransactionBuilder {
  private pdaHelper: PDAHelper;

  constructor(
    private program: Program,
    private connection: Connection
  ) {
    this.pdaHelper = new PDAHelper();
  }

  private async getBlockhash(): Promise<string> {
    // Try to get cached blockhash
    const cachedBlockhash = cacheManager.getBlockHash();
    if (cachedBlockhash) {
      return cachedBlockhash;
    }

    // If no cached blockhash, get new one and cache it with timeout protection
    const { blockhash } = await TimeoutOperations.blockchain.rpc(
      this.connection.getLatestBlockhash(),
      'getLatestBlockhash',
      { rpcEndpoint: this.connection.rpcEndpoint }
    );
    cacheManager.setBlockHash(blockhash);
    return blockhash;
  }

  // ==========================================================================
  // COMPANY MANAGEMENT
  // ==========================================================================

  async buildInitializeCompanyTx(
    companyId: string,
    companyDetails: string,
    authorityPubkey: PublicKey
  ): Promise<string> {
    const [companyPDA] = this.pdaHelper.getCompanyPDA(companyId);
    const companyIdBytes = utils.stringToU8Array6(companyId);

    const tx = await TimeoutOperations.blockchain.transaction(
      this.program.methods
        .initializeCompany(companyIdBytes, companyDetails)
        .accounts({
          company: companyPDA,
          authority: authorityPubkey,
          systemProgram: SystemProgram.programId, // Fixed snake_case to camelCase
        })
        .transaction(),
      'initializeCompany',
      { companyId, authorityPubkey: authorityPubkey.toBase58() }
    );

    tx.recentBlockhash = await this.getBlockhash();
    tx.feePayer = authorityPubkey;

    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }

  async buildUpdateCompanyTx(
    companyPubkey: PublicKey,
    authorityPubkey: PublicKey,
    updates: {
      companyDetails?: string;
      isActive?: boolean;
    }
  ): Promise<string> {
    const tx = await TimeoutOperations.blockchain.transaction(
      this.program.methods
        .updateCompany(
          updates.companyDetails || null,
          updates.isActive !== undefined ? updates.isActive : null
        )
        .accounts({
          company: companyPubkey,
          authority: authorityPubkey,
        })
        .transaction(),
      'updateCompany',
      { companyPubkey: companyPubkey.toBase58(), updates }
    );

    tx.recentBlockhash = await this.getBlockhash();
    tx.feePayer = authorityPubkey;

    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }

  // ==========================================================================
  // AUTHORITY TRANSFER (NEW)
  // ==========================================================================

  async buildProposeTransferAuthorityTx(
    companyPubkey: PublicKey,
    currentAuthority: PublicKey,
    newAuthority: PublicKey
  ): Promise<string> {
    const [pendingTransferPDA] =
      this.pdaHelper.getPendingTransferPDA(companyPubkey);

    const tx = await TimeoutOperations.blockchain.transaction(
      this.program.methods
        .proposeTransferAuthority(newAuthority)
        .accounts({
          company: companyPubkey,
          pendingTransfer: pendingTransferPDA,
          currentAuthority: currentAuthority,
          systemProgram: SystemProgram.programId,
        })
        .transaction(),
      'proposeTransferAuthority',
      { 
        companyPubkey: companyPubkey.toBase58(),
        newAuthority: newAuthority.toBase58()
      }
    );

    tx.recentBlockhash = await this.getBlockhash();
    tx.feePayer = currentAuthority;

    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }

  async buildAcceptTransferAuthorityTx(
    companyPubkey: PublicKey,
    newAuthority: PublicKey,
    oldAuthority: PublicKey // Needed for rent refund
  ): Promise<string> {
    const [pendingTransferPDA] =
      this.pdaHelper.getPendingTransferPDA(companyPubkey);

    const tx = await TimeoutOperations.blockchain.transaction(
      this.program.methods
        .acceptTransferAuthority()
        .accounts({
          company: companyPubkey,
          pendingTransfer: pendingTransferPDA,
          newAuthority: newAuthority,
          oldAuthority: oldAuthority,
        })
        .transaction(),
      'acceptTransferAuthority',
      { 
        companyPubkey: companyPubkey.toBase58(),
        newAuthority: newAuthority.toBase58()
      }
    );

    tx.recentBlockhash = await this.getBlockhash();
    tx.feePayer = newAuthority;

    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }

  async buildCancelTransferAuthorityTx(
    companyPubkey: PublicKey,
    currentAuthority: PublicKey
  ): Promise<string> {
    const [pendingTransferPDA] =
      this.pdaHelper.getPendingTransferPDA(companyPubkey);

    const tx = await TimeoutOperations.blockchain.transaction(
      this.program.methods
        .cancelTransferAuthority()
        .accounts({
          company: companyPubkey,
          pendingTransfer: pendingTransferPDA,
          currentAuthority: currentAuthority,
        })
        .transaction(),
      'cancelTransferAuthority',
      { companyPubkey: companyPubkey.toBase58() }
    );

    tx.recentBlockhash = await this.getBlockhash();
    tx.feePayer = currentAuthority;

    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }

  // ==========================================================================
  // EMPLOYEE MANAGEMENT
  // ==========================================================================

  async buildAddEmployeeTx(
    companyId: string,
    employeeWallet: PublicKey,
    employeeDetails: string,
    companyAuthorityPubkey: PublicKey
  ): Promise<string> {
    const [companyPDA] = this.pdaHelper.getCompanyPDA(companyId);
    const [employeePDA] = this.pdaHelper.getEmployeePDA(
      companyPDA,
      employeeWallet
    );

    const tx = await TimeoutOperations.blockchain.transaction(
      this.program.methods
        .addEmployee(employeeDetails)
        .accounts({
          company: companyPDA,
          employee: employeePDA,
          employeeWallet: employeeWallet,
          companyAuthority: companyAuthorityPubkey,
          systemProgram: SystemProgram.programId,
        })
        .transaction(),
      'addEmployee',
      { 
        companyId,
        employeeWallet: employeeWallet.toBase58()
      }
    );

    tx.recentBlockhash = await this.getBlockhash();
    tx.feePayer = companyAuthorityPubkey;

    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }

  async buildConfirmEmployeeTx(
    companyPubkey: PublicKey,
    employeeWalletPubkey: PublicKey
  ): Promise<string> {
    const [employeePDA] = this.pdaHelper.getEmployeePDA(
      companyPubkey,
      employeeWalletPubkey
    );

    const tx = await TimeoutOperations.blockchain.transaction(
      this.program.methods
        .confirmEmployee()
        .accounts({
          employee: employeePDA,
          employeeWallet: employeeWalletPubkey,
        })
        .transaction(),
      'confirmEmployee',
      { employeeWallet: employeeWalletPubkey.toBase58() }
    );

    tx.recentBlockhash = await this.getBlockhash();
    tx.feePayer = employeeWalletPubkey;

    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }

  async buildUpdateEmployeeStatusTx(
    companyPubkey: PublicKey,
    employeePubkey: PublicKey,
    newStatus: EmployeeStatus,
    companyAuthorityPubkey: PublicKey
  ): Promise<string> {
    const statusObj =
      newStatus === EmployeeStatus.Pending
        ? { pending: {} }
        : newStatus === EmployeeStatus.Active
          ? { active: {} }
          : { inactive: {} };

    const tx = await TimeoutOperations.blockchain.transaction(
      this.program.methods
        .updateEmployeeStatus(statusObj)
        .accounts({
          company: companyPubkey,
          employee: employeePubkey,
          companyAuthority: companyAuthorityPubkey,
        })
        .transaction(),
      'updateEmployeeStatus',
      { 
        employeePubkey: employeePubkey.toBase58(),
        newStatus
      }
    );

    tx.recentBlockhash = await this.getBlockhash();
    tx.feePayer = companyAuthorityPubkey;

    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }

  async buildUpdateEmployeeTx(
    companyPubkey: PublicKey,
    employeeWalletPubkey: PublicKey,
    companyAuthorityPubkey: PublicKey,
    employeeDetails: string
  ): Promise<string> {
    const [employeePDA] = this.pdaHelper.getEmployeePDA(
      companyPubkey,
      employeeWalletPubkey
    );

    const tx = await TimeoutOperations.blockchain.transaction(
      this.program.methods
        .updateEmployee(employeeDetails)
        .accounts({
          company: companyPubkey,
          employee: employeePDA,
          companyAuthority: companyAuthorityPubkey,
        })
        .transaction(),
      'updateEmployee',
      { employeeWallet: employeeWalletPubkey.toBase58() }
    );

    tx.recentBlockhash = await this.getBlockhash();
    tx.feePayer = companyAuthorityPubkey;

    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }

  // NEW: Close Employee Account
  async buildCloseEmployeeTx(
    companyPubkey: PublicKey,
    employeePubkey: PublicKey,
    authorityPubkey: PublicKey
  ): Promise<string> {
    const tx = await TimeoutOperations.blockchain.transaction(
      this.program.methods
        .closeEmployee()
        .accounts({
          company: companyPubkey,
          employee: employeePubkey,
          companyAuthority: authorityPubkey,
        })
        .transaction(),
      'closeEmployee',
      { employeePubkey: employeePubkey.toBase58() }
    );

    tx.recentBlockhash = await this.getBlockhash();
    tx.feePayer = authorityPubkey;

    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }

  // ==========================================================================
  // CERTIFICATE MANAGEMENT
  // ==========================================================================

  async buildIssueCertificateTx(
    companyPubkey: PublicKey,
    employeePubkey: PublicKey,
    certificateId: string,
    templateId: string,
    certificateDetails: string,
    companyAuthorityPubkey: PublicKey,
    expiresAt?: number
  ): Promise<string> {
    const [certificatePDA] = this.pdaHelper.getCertificatePDA(
      companyPubkey,
      certificateId
    );
    const [templatePDA] = this.pdaHelper.getTemplatePDA(
      companyPubkey,
      templateId
    );

    const certificateIdBytes = utils.stringToU8Array6(certificateId);
    const templateIdBytes = utils.stringToU8Array6(templateId);

    const tx = await TimeoutOperations.blockchain.transaction(
      this.program.methods
        .issueCertificate(
          certificateIdBytes,
          templateIdBytes,
          certificateDetails,
          expiresAt ? new BN(expiresAt) : null
        )
        .accounts({
          company: companyPubkey,
          employee: employeePubkey,
          certificate: certificatePDA,
          certificateTemplate: templatePDA,
          companyAuthority: companyAuthorityPubkey,
          systemProgram: SystemProgram.programId,
        })
        .transaction(),
      'issueCertificate',
      { 
        certificateId,
        templateId,
        employeePubkey: employeePubkey.toBase58()
      }
    );

    tx.recentBlockhash = await this.getBlockhash();
    tx.feePayer = companyAuthorityPubkey;

    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }

  async buildRevokeCertificateTx(
    companyPubkey: PublicKey,
    certificatePubkey: PublicKey,
    companyAuthorityPubkey: PublicKey
  ): Promise<string> {
    const tx = await TimeoutOperations.blockchain.transaction(
      this.program.methods
        .revokeCertificate()
        .accounts({
          company: companyPubkey,
          certificate: certificatePubkey,
          companyAuthority: companyAuthorityPubkey,
        })
        .transaction(),
      'revokeCertificate',
      { certificatePubkey: certificatePubkey.toBase58() }
    );

    tx.recentBlockhash = await this.getBlockhash();
    tx.feePayer = companyAuthorityPubkey;

    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }

  // NEW: Close Certificate Account
  async buildCloseCertificateTx(
    companyPubkey: PublicKey,
    certificatePubkey: PublicKey,
    authorityPubkey: PublicKey
  ): Promise<string> {
    const tx = await TimeoutOperations.blockchain.transaction(
      this.program.methods
        .closeCertificate()
        .accounts({
          company: companyPubkey,
          certificate: certificatePubkey,
          companyAuthority: authorityPubkey,
        })
        .transaction(),
      'closeCertificate',
      { certificatePubkey: certificatePubkey.toBase58() }
    );

    tx.recentBlockhash = await this.getBlockhash();
    tx.feePayer = authorityPubkey;

    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }

  // ==========================================================================
  // TEMPLATE MANAGEMENT
  // ==========================================================================

  async buildCreateCertificateTemplateTx(
    companyPubkey: PublicKey,
    templateId: string,
    certificateDetails: string,
    companyAuthorityPubkey: PublicKey
  ): Promise<string> {
    const [templatePDA] = this.pdaHelper.getTemplatePDA(
      companyPubkey,
      templateId
    );

    const templateIdBytes = utils.stringToU8Array6(templateId);

    const tx = await TimeoutOperations.blockchain.transaction(
      this.program.methods
        .createCertificateTemplate(templateIdBytes, certificateDetails)
        .accounts({
          company: companyPubkey,
          certificateTemplate: templatePDA,
          companyAuthority: companyAuthorityPubkey,
          systemProgram: SystemProgram.programId,
        })
        .transaction(),
      'createCertificateTemplate',
      { templateId }
    );

    tx.recentBlockhash = await this.getBlockhash();
    tx.feePayer = companyAuthorityPubkey;

    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }

  async buildUpdateCertificateTemplateTx(
    companyPubkey: PublicKey,
    templatePubkey: PublicKey,
    certificateDetails: string,
    companyAuthorityPubkey: PublicKey
  ): Promise<string> {
    const tx = await TimeoutOperations.blockchain.transaction(
      this.program.methods
        .updateCertificateTemplate(certificateDetails)
        .accounts({
          company: companyPubkey,
          certificateTemplate: templatePubkey,
          companyAuthority: companyAuthorityPubkey,
        })
        .transaction(),
      'updateCertificateTemplate',
      { templatePubkey: templatePubkey.toBase58() }
    );

    tx.recentBlockhash = await this.getBlockhash();
    tx.feePayer = companyAuthorityPubkey;

    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }

  // ==========================================================================
  // AWARD MANAGEMENT
  // ==========================================================================

  async buildCreateAwardTypeTx(
    companyPubkey: PublicKey,
    awardTypeId: string,
    metadataUri: string,
    companyAuthorityPubkey: PublicKey
  ): Promise<string> {
    const [awardTypePDA] = this.pdaHelper.getAwardTypePDA(
      companyPubkey,
      awardTypeId
    );
    const awardTypeIdBytes = utils.stringToU8Array6(awardTypeId);

    const tx = await TimeoutOperations.blockchain.transaction(
      this.program.methods
        .createAwardType(awardTypeIdBytes, metadataUri)
        .accounts({
          company: companyPubkey,
          awardType: awardTypePDA,
          companyAuthority: companyAuthorityPubkey,
          systemProgram: SystemProgram.programId,
        })
        .transaction(),
      'createAwardType',
      { awardTypeId }
    );

    tx.recentBlockhash = await this.getBlockhash();
    tx.feePayer = companyAuthorityPubkey;

    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }

  async buildUpdateAwardTypeTx(
    companyPubkey: PublicKey,
    awardTypePubkey: PublicKey,
    updates: {
      metadataUri?: string;
      isActive?: boolean;
    },
    companyAuthorityPubkey: PublicKey
  ): Promise<string> {
    const tx = await TimeoutOperations.blockchain.transaction(
      this.program.methods
        .updateAwardType(
          updates.metadataUri || null,
          updates.isActive !== undefined ? updates.isActive : null
        )
        .accounts({
          company: companyPubkey,
          awardType: awardTypePubkey,
          companyAuthority: companyAuthorityPubkey,
        })
        .transaction(),
      'updateAwardType',
      { awardTypePubkey: awardTypePubkey.toBase58(), updates }
    );

    tx.recentBlockhash = await this.getBlockhash();
    tx.feePayer = companyAuthorityPubkey;

    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }

  async buildMintAwardNFTTx(
    companyPubkey: PublicKey,
    employeePubkey: PublicKey,
    employeeWalletPubkey: PublicKey,
    awardTypePubkey: PublicKey,
    awardId: string,
    companyAuthorityPubkey: PublicKey,
    name: string,
    symbol: string
  ): Promise<string> {
    const [awardPDA] = this.pdaHelper.getAwardPDA(companyPubkey, awardId);
    const [mintPDA] = this.pdaHelper.getAwardMintPDA(companyPubkey, awardId);

    // Find ATA address
    const [recipientTokenAccount] = PublicKey.findProgramAddressSync(
      [
        employeeWalletPubkey.toBuffer(),
        token.TOKEN_PROGRAM_ID.toBuffer(),
        mintPDA.toBuffer(),
      ],
      spl.ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Find metadata address
    const [metadata] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintPDA.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const awardIdBytes = utils.stringToU8Array6(awardId);

    const tx = await TimeoutOperations.blockchain.transaction(
      this.program.methods
        .mintAwardNft(awardIdBytes, name, symbol)
        .accounts({
          company: companyPubkey,
          employee: employeePubkey,
          awardType: awardTypePubkey,
          award: awardPDA,
          mint: mintPDA,
          employeeWallet: employeeWalletPubkey,
          recipientTokenAccount,
          metadata,
          companyAuthority: companyAuthorityPubkey,
          tokenProgram: token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .transaction(),
      'mintAwardNft',
      { 
        awardId,
        employeeWallet: employeeWalletPubkey.toBase58(),
        name,
        symbol
      }
    );

    tx.recentBlockhash = await this.getBlockhash();
    tx.feePayer = companyAuthorityPubkey;

    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }
}
